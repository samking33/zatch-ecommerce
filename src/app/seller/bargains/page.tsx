import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductMedia } from "@/components/ui/product-media";
import { BargainRespond } from "@/components/seller/bargain-respond";
import { bargains as bargainsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { inr } from "@/lib/utils";

export const metadata = { title: "Seller · Bargains" };

type Bargain = {
  _id: string;
  status?: string;
  originalPrice?: number;
  offeredPrice?: number;
  currentPrice?: number;
  quantity?: number;
  buyerNote?: string;
  productSnapshot?: { name?: string; image?: string };
  buyerId?: { username?: string } | string;
};

const PENDING = ["pending", "countered", "buyer_countered", "active"];

export default async function SellerBargainsPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your bargains" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const all = ((await bargainsApi.sellerBargains(t)) as Bargain[] | null) ?? [];
  const pending = all.filter((b) => PENDING.includes((b.status ?? "").toLowerCase()));
  const rest = all.filter((b) => !PENDING.includes((b.status ?? "").toLowerCase()));

  return (
    <SellerShell>
      <SellerHeader title="Bargains" sub={`${pending.length} offer${pending.length !== 1 ? "s" : ""} awaiting your reply`} />

      {all.length === 0 ? (
        <EmptyState title="No bargains yet" sub="When buyers make offers, respond here in real time." />
      ) : (
        <div className="flex flex-col gap-3">
          {[...pending, ...rest].map((b) => {
            const offered = b.offeredPrice ?? b.currentPrice ?? 0;
            const list = b.originalPrice ?? offered;
            const buyer = typeof b.buyerId === "object" ? b.buyerId?.username : undefined;
            const isPending = PENDING.includes((b.status ?? "").toLowerCase());
            return (
              <div key={b._id} className="card flex flex-wrap items-center gap-4 rounded-[1.5rem] p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                  <ProductMedia src={b.productSnapshot?.image} alt={b.productSnapshot?.name ?? "Item"} sizes="64px" className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{b.productSnapshot?.name ?? "Product"}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {buyer ? `${buyer} · ` : ""}List {inr(list)}
                    {b.quantity && b.quantity > 1 ? ` · Qty ${b.quantity}` : ""}
                  </p>
                  {b.buyerNote && <p className="mt-1 text-sm italic text-ink-soft">“{b.buyerNote}”</p>}
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-muted">Offered</p>
                  <p className="font-display text-lg font-semibold text-ink">{inr(offered)}</p>
                </div>
                {isPending ? (
                  <BargainRespond bargainId={b._id} offered={offered} list={list} />
                ) : (
                  <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold capitalize text-ink">{b.status}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SellerShell>
  );
}
