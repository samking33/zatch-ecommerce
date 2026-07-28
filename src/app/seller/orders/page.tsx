import Link from "next/link";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductMedia } from "@/components/ui/product-media";
import { OrderStatusControl } from "@/components/seller/order-status-control";
import { orders as ordersApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { inr } from "@/lib/utils";

export const metadata = { title: "Seller · Orders" };

type Line = { name?: string; image?: string; qty?: number; total?: number; price?: number };
type Order = { _id: string; orderId?: string; status?: string; createdAt?: string; product?: Line; items?: Line[]; pricing?: { total?: number }; buyer?: { username?: string }; deliveryAddress?: { city?: string } };

const RANGES = [
  { key: "", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];
const SORTS = [
  { key: "", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "amount_high", label: "Amount ↓" },
  { key: "amount_low", label: "Amount ↑" },
];

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; range?: string; sort?: string }>;
}) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your orders" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { q = "", status = "", range = "", sort = "" } = await searchParams;
  const list = ((await ordersApi.sellerOrders(t, {
    search: q || undefined,
    status: status || undefined,
    timeRange: range || undefined,
    sortBy: sort || undefined,
  })) as Order[] | null) ?? [];

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${active ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`;
  const withParam = (k: string, v: string) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...(range && { range }), ...(sort && { sort }) });
    v ? p.set(k, v) : p.delete(k);
    const s = p.toString();
    return `/seller/orders${s ? `?${s}` : ""}`;
  };

  return (
    <SellerShell>
      <form action="/seller/orders" className="mb-4 flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {range && <input type="hidden" name="range" value={range} />}
        {sort && <input type="hidden" name="sort" value={sort} />}
        <input name="q" defaultValue={q} placeholder="Search order id, item, city, pincode…" className="h-11 min-w-[16rem] flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />
        <button type="submit" className="btn-ink rounded-full px-5 text-sm font-semibold">Search</button>
        {(q || status || range || sort) && <Link href="/seller/orders" className="grid place-items-center rounded-full border border-hairline px-4 text-sm text-muted hover:text-ink">Clear</Link>}
      </form>

      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted">Period</span>
        {RANGES.map((r) => <Link key={r.key} href={withParam("range", r.key)} className={chip((range || "") === r.key)}>{r.label}</Link>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted">Sort</span>
        {SORTS.map((s) => <Link key={s.key} href={withParam("sort", s.key)} className={chip((sort || "") === s.key)}>{s.label}</Link>)}
      </div>

      <SellerHeader title="Orders" sub={`${list.length} order${list.length !== 1 ? "s" : ""} to fulfil`} />
      {list.length === 0 ? (
        <EmptyState title="No orders yet" sub="Orders from buyers will appear here to fulfil." />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((o) => {
            const line = o.product ?? o.items?.[0] ?? {};
            const total = o.pricing?.total ?? line.total ?? 0;
            return (
              <div key={o._id} className="card flex flex-wrap items-center gap-4 rounded-[1.5rem] p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                  <ProductMedia src={line.image} alt={line.name ?? "Order"} sizes="64px" className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{line.name ?? `Order ${o.orderId ?? o._id.slice(-6)}`}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    #{o.orderId ?? o._id.slice(-6)}
                    {o.buyer?.username ? ` · ${o.buyer.username}` : ""}
                    {line.qty ? ` · Qty ${line.qty}` : ""}
                  </p>
                </div>
                <span className="font-display text-lg font-semibold text-ink">{inr(total)}</span>
                <OrderStatusControl orderId={o._id} status={o.status} />
              </div>
            );
          })}
        </div>
      )}
    </SellerShell>
  );
}
