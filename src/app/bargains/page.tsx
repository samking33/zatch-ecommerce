import Link from "next/link";
import { Tag } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { bargains as bargainsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { inr } from "@/lib/utils";

export const metadata = { title: "My bargains" };

type Bargain = {
  _id: string;
  status?: string;
  originalPrice?: number;
  offeredPrice?: number;
  currentPrice?: number;
  productSnapshot?: { name?: string; image?: string };
};

const statusTone: Record<string, string> = {
  accepted: "bg-lime text-lime-ink",
  countered: "bg-surface-2 text-ink",
  pending: "bg-surface-2 text-ink",
  rejected: "bg-live/10 text-live",
};

export default async function BargainsPage() {
  const t = await serverToken();
  if (!t) {
    return (
      <PageShell>
        <div className="pt-6">
          <SignInRequired what="your bargains" />
        </div>
      </PageShell>
    );
  }

  const data = (await bargainsApi.myBargains(t)) as Bargain[] | null;
  const list = Array.isArray(data) ? data : [];

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="My bargains" sub="Your live offers and seller counters." />
      {list.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-lime text-lime-ink">
            <Tag className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">No active offers</h2>
          <p className="mt-2 text-muted">Find something you like and name your price.</p>
          <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((b) => {
            const current = b.currentPrice ?? b.offeredPrice ?? 0;
            return (
              <div key={b._id} className="card flex items-center gap-4 rounded-[1.5rem] p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                  <ProductMedia src={b.productSnapshot?.image} alt={b.productSnapshot?.name ?? "Item"} sizes="80px" className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">
                    {b.productSnapshot?.name ?? "Product"}
                  </p>
                  {b.originalPrice ? (
                    <p className="mt-0.5 text-sm text-muted">List {inr(b.originalPrice)}</p>
                  ) : null}
                  {b.status && (
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${
                        statusTone[b.status] ?? "bg-surface-2 text-ink"
                      }`}
                    >
                      {b.status}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-muted">Your price</p>
                  <p className="font-display text-lg font-semibold text-ink">{inr(current)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
