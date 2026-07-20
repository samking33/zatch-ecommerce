import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { OrderStatusControl } from "@/components/seller/order-status-control";
import { orders as ordersApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { inr } from "@/lib/utils";

export const metadata = { title: "Seller · Orders" };

type Line = { name?: string; image?: string; qty?: number; total?: number; price?: number };
type Order = { _id: string; orderId?: string; status?: string; createdAt?: string; product?: Line; items?: Line[]; pricing?: { total?: number }; buyer?: { username?: string }; deliveryAddress?: { city?: string } };

export default async function SellerOrdersPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your orders" /></div></SellerShell>;

  const list = ((await ordersApi.sellerOrders(t)) as Order[] | null) ?? [];

  return (
    <SellerShell>
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
