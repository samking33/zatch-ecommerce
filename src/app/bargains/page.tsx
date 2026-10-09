import Link from "next/link";
import { Tag, Clock } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { BuyerBargainActions } from "@/components/product/buyer-bargain-actions";
import { RefreshOn } from "@/components/realtime/refresh-on";
import { bargains as bargainsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { inr } from "@/lib/utils";

export const metadata = { title: "My bargains" };
export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  accepted: "bg-lime text-lime-ink",
  auto_accepted: "bg-lime text-lime-ink",
  countered: "bg-surface-2 text-ink",
  pending: "bg-surface-2 text-ink",
  rejected: "bg-live/10 text-live",
  expired: "bg-surface-2 text-muted",
};

// Statuses where the ball is in the buyer's court.
const NEEDS_BUYER = ["countered", "seller_countered"];
const ACTIVE = ["pending", "countered", "buyer_countered"];
const HISTORY = ["accepted", "auto_accepted", "rejected", "expired"];

const TABS = [
  { key: "active", label: "Active" },
  { key: "history", label: "History" },
] as const;

export default async function BargainsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const t = await serverToken();
  if (!t) {
    return (
      <PageShell>
        <div className="pt-6"><SignInRequired what="your bargains" /></div>
      </PageShell>
    );
  }

  const { tab: requestedTab } = await searchParams;
  const tab = requestedTab === "history" ? "history" : "active";
  const data = await bargainsApi.myBargains(t);
  const statuses = tab === "history" ? HISTORY : ACTIVE;
  const list = Array.isArray(data) ? data.filter((b) => statuses.includes(b.status)) : [];
  const waiting = list.filter((b) => NEEDS_BUYER.includes((b.status ?? "").toLowerCase())).length;

  return (
    <PageShell>
      <RefreshOn events={["bargain_countered", "bargain_accepted", "bargain_rejected"]} />
      <PageHeader
        eyebrow="Account"
        title="My bargains"
        sub={waiting > 0 ? `${waiting} seller counter${waiting !== 1 ? "s" : ""} waiting on you` : "Your live offers and seller counters."}
      />
      <div className="mb-5 flex gap-2">
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={`/bargains?tab=${x.key}`}
            aria-current={tab === x.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === x.key ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      {!Array.isArray(data) ? (
        <div role="alert" className="card rounded-[2rem] px-6 py-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">Couldn&apos;t load your bargains</h2>
          <p className="mt-2 text-muted">Please try again. If this continues, sign in again.</p>
          <form action="/bargains" className="mt-6">
            <input type="hidden" name="tab" value={tab} />
            <button className="pill-lime rounded-full px-6 py-3 text-sm font-semibold">Try again</button>
          </form>
        </div>
      ) : list.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-lime text-lime-ink">
            <Tag className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">{tab === "history" ? "No offer history" : "No active offers"}</h2>
          <p className="mt-2 text-muted">{tab === "history" ? "Your accepted, declined and expired offers will appear here." : "Find something you like and name your price."}</p>
          <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Browse products</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((b) => {
            const status = (b.status ?? "").toLowerCase();
            const yours = b.offeredPrice ?? b.currentPrice ?? 0;
            const counter = b.counterOffer?.price ?? b.currentPrice;
            const needsYou = NEEDS_BUYER.includes(status) && !!counter;
            const pid = b.product._id;

            return (
              <div key={b._id} className="card flex flex-wrap items-center gap-4 rounded-[1.5rem] p-3">
                <Link href={pid ? `/product/${pid}` : "/shop"} className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                  <ProductMedia src={b.product.image} alt={b.product.name} sizes="80px" className="h-full w-full" />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/bargains/${b._id}`} className="line-clamp-1 font-display text-[15px] font-semibold text-ink hover:underline">
                    {b.product.name}
                  </Link>
                  {(b.product.discountedPrice || b.product.price) ? <p className="mt-0.5 text-sm text-muted">List {inr(b.product.discountedPrice || b.product.price)}</p> : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {b.status && (
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${statusTone[status] ?? "bg-surface-2 text-ink"}`}>
                        {b.status.replace(/_/g, " ")}
                      </span>
                    )}
                    {b.timeLeft?.text && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                        b.timeLeft.isExpiringSoon ? "bg-live/10 text-live" : "bg-surface-2 text-muted"
                      }`}>
                        <Clock className="h-3 w-3" /> {b.timeLeft.text} left
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[12px] text-muted">{needsYou ? "Seller countered" : "Your price"}</p>
                  <p className="font-display text-lg font-semibold text-ink">{inr(needsYou ? counter! : yours)}</p>
                </div>

                {needsYou && (
                  <BuyerBargainActions
                    bargainId={b._id}
                    counterPrice={counter!}
                    listPrice={b.product.discountedPrice || b.product.price || counter!}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
