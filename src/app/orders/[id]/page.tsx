import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { OrderActions, type ServerAction } from "@/components/orders/order-actions";
import { orders as ordersApi } from "@/lib/api";
import { serverToken, userIdFromToken } from "@/lib/session";
import { inr, variantText } from "@/lib/utils";

type Line = { name?: string; image?: string; qty?: number; price?: number; total?: number; productId?: string; variant?: { color?: string | null; size?: string | null } };
type TimelineEvent = { key: string; label: string; description?: string; timestamp?: string | null; isDone?: boolean };
// Shape of GET /orders/:id (orderController getOrderController).
type Order = {
  _id: string;
  orderId?: string;
  status?: string;
  orderType?: string;
  deliveryType?: string;
  items?: Line[];
  progress?: { timeline?: TimelineEvent[] };
  deliveryInfo?: { name?: string; formattedAddress?: string; phone?: string };
  paymentDetails?: { subtotal?: number; discount?: number; shipping?: number; tax?: number; methodLabel?: string; status?: string };
  statusHistory?: { status?: string; note?: string; timestamp?: string }[];
  availableActions?: ServerAction[];
  tracking?: { awb?: string; courier?: string; isAvailable?: boolean; estimatedDelivery?: string };
  seller?: { id?: string; businessName?: string; name?: string } | null;
  expectedDeliveryFormatted?: string;
  // Seller-only settlement sheet (commission, GST, TCS/TDS) per order.
  paymentSection?: {
    type?: string; paymentId?: string; isPaid?: boolean;
    breakdown?: { label: string; value?: number; formatted?: string; type?: string }[];
  };
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await serverToken();
  if (!t) {
    return (
      <PageShell>
        <div className="pt-6">
          <SignInRequired what="this order" />
        </div>
      </PageShell>
    );
  }

  const order = (await ordersApi.get(id, t)) as Order | null;
  if (!order) {
    return (
      <PageShell>
        <div className="card mt-6 grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
            <Package className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Order not found</h1>
          <Link href="/orders" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
            Back to orders
          </Link>
        </div>
      </PageShell>
    );
  }

  // Only the seller of this order may see the settlement breakdown.
  const viewerId = userIdFromToken(t);
  const sellerId = order.seller?.id;
  const isSeller = !!viewerId && !!sellerId && viewerId === sellerId;

  const lines = order.items ?? [];
  const p = order.paymentDetails ?? {};
  // The order total, worked out the same way as the orders list.
  const total = (p.subtotal ?? 0) - (p.discount ?? 0) + (p.shipping ?? 0);
  const cancelled = (order.status ?? "").toLowerCase() === "cancelled"
    ? [...(order.statusHistory ?? [])].reverse().find((h) => h.status === "cancelled")
    : undefined;
  // Prefer the server's computed timeline (labels, descriptions, timestamps).
  const timeline: TimelineEvent[] = order.progress?.timeline?.length
    ? order.progress.timeline.filter((e) => e.key !== "in_transit")
    : ["pending", "confirmed", "shipped", "delivered"].map((s, i) => ({
        key: s,
        label: s,
        isDone: Math.max(0, ["pending", "confirmed", "shipped", "delivered"].indexOf((order.status ?? "pending").toLowerCase())) >= i,
      }));
  return (
    <PageShell>
      <Link href="/orders" className="mt-5 inline-flex items-center gap-2 px-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="card rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-xl font-semibold text-ink">
                Order #{order.orderId ?? order._id.slice(-8)}
              </h1>
              <div className="flex items-center gap-2">
                {order.expectedDeliveryFormatted && (
                  <span className="hidden rounded-full bg-surface-2 px-3 py-1 text-[13px] text-muted sm:inline">
                    Arrives by {order.expectedDeliveryFormatted}
                  </span>
                )}
                {order.status && (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium capitalize text-ink">{order.status}</span>
                )}
              </div>
            </div>
            {/* server-computed tracking timeline */}
            <div className="mt-6 flex items-center gap-1">
              {timeline.map((e, i) => (
                <div key={e.key} className="flex flex-1 items-center gap-1">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${e.isDone ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
                  {i < timeline.length - 1 && <span className={`h-1 flex-1 rounded-full ${timeline[i + 1].isDone ? "bg-lime" : "bg-hairline"}`} />}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between gap-2 text-[12px] capitalize text-muted">
              {timeline.map((e) => (
                <span key={e.key} className="flex-1 last:text-right">
                  {e.label}
                  {e.timestamp && (
                    <span className="block text-[11px] normal-case text-muted/70">
                      {new Date(e.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="card rounded-[1.75rem] p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Items</h2>
            <div className="mt-4 flex flex-col gap-3">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <ProductMedia src={l.image} alt={l.name ?? "Item"} sizes="64px" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[15px] font-medium text-ink">{l.name}</p>
                    <p className="text-sm text-muted">
                      {[variantText(" · ", l.variant?.color, l.variant?.size), `Qty ${l.qty ?? 1}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="font-medium text-ink">{inr(l.total ?? l.price ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>

          {order.deliveryInfo?.formattedAddress && (
            <div className="card rounded-[1.75rem] p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Delivery to</h2>
              <p className="mt-2 text-[15px] text-ink-soft">
                {order.deliveryInfo.name && <span className="font-medium text-ink">{order.deliveryInfo.name} · </span>}
                {order.deliveryInfo.formattedAddress}
                {order.deliveryInfo.phone ? ` · ${order.deliveryInfo.phone}` : ""}
              </p>
              {order.tracking?.isAvailable && (
                <p className="mt-2 text-sm text-muted">Shipped with {order.tracking.courier} · AWB {order.tracking.awb}</p>
              )}
            </div>
          )}

          {cancelled && (
            <div className="card rounded-[1.75rem] p-6">
              <h2 className="font-display text-lg font-semibold text-live">Order cancelled</h2>
              {cancelled.note && <p className="mt-1.5 text-[15px] text-ink-soft">{cancelled.note}</p>}
              {cancelled.timestamp && (
                <p className="mt-1 text-[13px] text-muted">{new Date(cancelled.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
              )}
            </div>
          )}

          <OrderActions
            orderId={order._id}
            actions={order.availableActions}
            sellerId={sellerId}
            tracking={order.tracking}
            buyAgain={
              !isSeller && ["delivered", "cancelled"].includes((order.status ?? "").toLowerCase())
                ? lines.flatMap((l) => (l.productId ? [{ productId: l.productId, variantColor: l.variant?.color ?? "", variantSize: l.variant?.size ?? "", qty: l.qty ?? 1 }] : []))
                : undefined
            }
          />
        </div>

        <aside className="card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-semibold text-ink">Payment</h2>
          <dl className="mt-4 space-y-2.5 text-[15px]">
            {p.subtotal != null && <Row label="Subtotal" value={inr(p.subtotal)} />}
            {p.discount ? <Row label="Discount" value={`− ${inr(p.discount)}`} /> : null}
            {p.shipping != null && <Row label="Shipping" value={p.shipping ? inr(p.shipping) : "Free"} />}
            {p.tax ? <Row label="Tax" value={inr(p.tax)} /> : null}
            <div className="border-t border-hairline pt-2.5">
              <Row label="Total" value={inr(total)} strong />
            </div>
          </dl>
          {p.methodLabel && (
            <p className="mt-3 text-sm text-muted">
              {p.methodLabel}{p.status ? ` · ${p.status}` : ""}
            </p>
          )}

          {/* Seller settlement sheet (commission, GST, seller payout). This is
              seller-only data: never show it to the buyer, even if the API
              includes it in the response. Gate on the viewer being the seller. */}
          {isSeller && !!order.paymentSection?.breakdown?.length && (
            <div className="mt-5 border-t border-hairline pt-4">
              <h3 className="font-display text-[15px] font-semibold text-ink">Settlement</h3>
              <dl className="mt-2.5 space-y-1.5 text-[13px]">
                {order.paymentSection.breakdown.map((b, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <dt className="text-muted">{b.label}</dt>
                    <dd className={`shrink-0 font-medium ${b.type === "deduction" ? "text-live" : "text-ink"}`}>
                      {b.formatted ?? inr(b.value ?? 0)}
                    </dd>
                  </div>
                ))}
              </dl>
              {order.paymentSection.paymentId && (
                <p className="mt-2 text-[12px] text-muted">Ref {order.paymentSection.paymentId}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-display text-lg font-semibold text-ink" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}
