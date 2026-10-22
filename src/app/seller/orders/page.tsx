import Link from "next/link";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductMedia } from "@/components/ui/product-media";
import { OrderStatusControl } from "@/components/seller/order-status-control";
import { orders as ordersApi } from "@/lib/api";
import { serverToken, userIdFromToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { inr } from "@/lib/utils";

export const metadata = { title: "Seller · Orders" };

type Line = { name?: string; image?: string; qty?: number; total?: number; price?: number; sellerId?: string };
type Order = {
  _id: string; orderId?: string; status?: string; createdAt?: string; items?: Line[]; pricing?: { total?: number };
  buyerId?: { username?: string }; sellerId?: string; sellerIds?: string[];
};
type Page = { orders?: Order[]; pagination?: { currentPage?: number; totalPages?: number; totalOrders?: number } };

const RANGES = [
  { key: "", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];
// The server sorts by a field name and a direction.
const SORTS = [
  { key: "", label: "Newest", sortBy: "createdAt", sortOrder: "desc" },
  { key: "oldest", label: "Oldest", sortBy: "createdAt", sortOrder: "asc" },
  { key: "amount_high", label: "Amount ↓", sortBy: "pricing.total", sortOrder: "desc" },
  { key: "amount_low", label: "Amount ↑", sortBy: "pricing.total", sortOrder: "asc" },
];

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; range?: string; sort?: string; page?: string; from?: string; to?: string }>;
}) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your orders" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { q = "", status = "", range = "", sort = "", page = "1", from = "", to = "" } = await searchParams;
  // A date range (the app's "Date Range (Created At)") overrides the period chips.
  const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  const custom = isDate(from) && isDate(to);
  const order = SORTS.find((x) => x.key === sort) ?? SORTS[0];
  const res = (await ordersApi.sellerOrdersRaw(t, {
    search: q || undefined,
    status: status || undefined,
    timeRange: custom ? "custom" : range || undefined,
    ...(custom ? { startDate: from, endDate: to } : {}),
    sortBy: order.sortBy,
    sortOrder: order.sortOrder,
    page: String(Math.max(1, Number(page) || 1)),
  })) as Page | null;
  // The server's search replaces its "this seller only" filter, so it can return other sellers'
  // orders. Keep only this seller's, here on the server, until the backend is fixed.
  const me = userIdFromToken(t);
  const mine = (o: Order) => o.sellerId === me || !!o.sellerIds?.includes(me ?? "") || !!o.items?.some((i) => i.sellerId === me);
  const list = (res?.orders ?? []).filter(mine);
  const pages = res?.pagination?.totalPages ?? 1;
  const current = res?.pagination?.currentPage ?? 1;
  const count = q ? list.length : res?.pagination?.totalOrders ?? list.length;

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${active ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`;
  const withParam = (k: string, v: string) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...(range && { range }), ...(sort && { sort }) });
    v ? p.set(k, v) : p.delete(k);
    if (k !== "page") p.delete("page");
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
        <input type="date" name="from" defaultValue={from} aria-label="From date" className="h-11 rounded-full border border-hairline bg-surface-2 px-3 text-[14px] text-ink focus:border-ink focus:outline-none" />
        <input type="date" name="to" defaultValue={to} aria-label="To date" className="h-11 rounded-full border border-hairline bg-surface-2 px-3 text-[14px] text-ink focus:border-ink focus:outline-none" />
        {(q || status || range || sort || from || to) && <Link href="/seller/orders" className="grid place-items-center rounded-full border border-hairline px-4 text-sm text-muted hover:text-ink">Clear</Link>}
      </form>

      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted">Period</span>
        {RANGES.map((r) => <Link key={r.key} href={withParam("range", r.key)} className={chip((range || "") === r.key)}>{r.label}</Link>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted">Sort</span>
        {SORTS.map((s) => <Link key={s.key} href={withParam("sort", s.key)} className={chip((sort || "") === s.key)}>{s.label}</Link>)}
      </div>

      <SellerHeader title="Orders" sub={`${count} order${count !== 1 ? "s" : ""}`} />
      {list.length === 0 ? (
        <EmptyState title="No orders yet" sub="Orders from buyers will appear here to fulfil." />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((o) => {
            const line = o.items?.[0] ?? {};
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
                    {o.buyerId?.username ? ` · ${o.buyerId.username}` : ""}
                    {line.qty ? ` · Qty ${line.qty}` : ""}
                  </p>
                </div>
                <span className="font-display text-lg font-semibold text-ink">{inr(total)}</span>
                <OrderStatusControl orderId={o._id} status={o.status} />
              </div>
            );
          })}
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-2 flex items-center justify-center gap-3 text-sm">
              {current > 1 && <Link href={withParam("page", String(current - 1))} className={chip(false)}>Previous</Link>}
              <span className="text-muted">Page {current} of {pages}</span>
              {current < pages && <Link href={withParam("page", String(current + 1))} className={chip(false)}>Next</Link>}
            </nav>
          )}
        </div>
      )}
    </SellerShell>
  );
}
