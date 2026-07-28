import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Tag } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { BuyerBargainActions } from "@/components/product/buyer-bargain-actions";
import { bargains as bargainsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { inr } from "@/lib/utils";

export const metadata = { title: "Bargain" };
export const dynamic = "force-dynamic";

type Entry = { by?: string; role?: string; price?: number; amount?: number; message?: string; createdAt?: string };
type Bargain = {
  _id: string;
  status?: string;
  originalPrice?: number;
  offeredPrice?: number;
  currentPrice?: number;
  quantity?: number;
  buyerNote?: string;
  counterOffer?: { price?: number; message?: string };
  history?: Entry[];
  negotiationHistory?: Entry[];
  productId?: string | { _id?: string; name?: string; images?: { url?: string }[] };
  productSnapshot?: { name?: string; image?: string };
  expiresAt?: string;
};

const NEEDS_BUYER = ["countered", "seller_countered"];

export default async function BargainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await serverToken();
  if (!t) {
    return <PageShell><div className="pt-6"><SignInRequired what="this bargain" /></div></PageShell>;
  }

  const b = (await bargainsApi.get(id, t)) as Bargain | null;
  if (!b?._id) notFound();

  const status = (b.status ?? "").toLowerCase();
  const counter = b.counterOffer?.price ?? b.currentPrice;
  const needsYou = NEEDS_BUYER.includes(status) && !!counter;
  const prod = typeof b.productId === "object" ? b.productId : undefined;
  const name = b.productSnapshot?.name ?? prod?.name ?? "Product";
  const image = b.productSnapshot?.image ?? prod?.images?.[0]?.url;
  const pid = prod?._id ?? (typeof b.productId === "string" ? b.productId : undefined);

  // Thread: whatever history the backend gives, else derive from the offer pair.
  const thread: Entry[] = (b.negotiationHistory ?? b.history ?? []).length
    ? (b.negotiationHistory ?? b.history)!
    : [
        { role: "buyer", price: b.offeredPrice, message: b.buyerNote },
        ...(counter && counter !== b.offeredPrice ? [{ role: "seller", price: counter, message: b.counterOffer?.message }] : []),
      ];

  return (
    <PageShell>
      <Link href="/bargains" className="mt-5 inline-flex items-center gap-2 px-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> My bargains
      </Link>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* product */}
          <div className="card flex items-center gap-4 rounded-[1.75rem] p-4">
            <Link href={pid ? `/product/${pid}` : "/shop"} className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
              <ProductMedia src={image} alt={name} sizes="80px" className="h-full w-full" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 font-display text-lg font-semibold text-ink">{name}</p>
              {b.originalPrice ? <p className="text-sm text-muted">List {inr(b.originalPrice)}</p> : null}
              {b.quantity && b.quantity > 1 ? <p className="text-sm text-muted">Qty {b.quantity}</p> : null}
            </div>
            <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold capitalize text-ink">
              {(b.status ?? "pending").replace(/_/g, " ")}
            </span>
          </div>

          {/* negotiation thread */}
          <div className="card rounded-[1.75rem] p-6">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Tag className="h-4 w-4" /> Negotiation
            </h2>
            <div className="mt-4 space-y-3">
              {thread.filter((e) => e.price ?? e.amount).map((e, i) => {
                const mine = (e.role ?? e.by ?? "buyer").toLowerCase().includes("buy");
                return (
                  <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${mine ? "bg-ink text-surface" : "bg-surface-2 text-ink"}`}>
                      <p className={`text-[11px] font-medium ${mine ? "text-surface/60" : "text-muted"}`}>
                        {mine ? "You offered" : "Seller countered"}
                      </p>
                      <p className="font-display text-xl font-semibold">{inr(e.price ?? e.amount ?? 0)}</p>
                      {e.message && <p className={`mt-1 text-[13px] ${mine ? "text-surface/80" : "text-ink-soft"}`}>{e.message}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* action panel */}
        <aside className="card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-28">
          <p className="text-[13px] text-muted">{needsYou ? "Seller's counter" : "Your offer"}</p>
          <p className="mt-0.5 font-display text-3xl font-semibold text-ink">
            {inr(needsYou ? counter! : (b.offeredPrice ?? b.currentPrice ?? 0))}
          </p>
          {b.originalPrice ? (
            <p className="mt-1 text-sm text-muted">
              {Math.round((1 - (needsYou ? counter! : b.offeredPrice ?? 0) / b.originalPrice) * 100)}% off list
            </p>
          ) : null}

          <div className="mt-5">
            {needsYou ? (
              <BuyerBargainActions
                bargainId={b._id}
                counterPrice={counter!}
                listPrice={b.originalPrice ?? counter!}
              />
            ) : ["accepted", "auto_accepted"].includes(status) ? (
              <Link href="/cart" className="pill-lime inline-block rounded-full px-6 py-3 text-sm font-semibold">
                Go to cart
              </Link>
            ) : (
              <p className="text-[15px] text-muted">
                {status === "rejected" ? "This offer was declined." : "Waiting for the seller to respond."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
