import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { orders as ordersApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { inr } from "@/lib/utils";

type Line = { name?: string; image?: string; qty?: number; price?: number; total?: number };
type Order = {
  _id: string;
  orderId?: string;
  status?: string;
  createdAt?: string;
  product?: Line;
  items?: Line[];
  deliveryAddress?: { label?: string; line1?: string; city?: string; state?: string; pincode?: string; phone?: string };
  payment?: { method?: string; status?: string };
  pricing?: { subtotal?: number; discount?: number; shipping?: number; tax?: number; total?: number };
};

const steps = ["pending", "confirmed", "shipped", "delivered"];

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

  const lines = order.items?.length ? order.items : order.product ? [order.product] : [];
  const p = order.pricing ?? {};
  const activeStep = Math.max(0, steps.indexOf((order.status ?? "pending").toLowerCase()));

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
              {order.status && (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium capitalize text-ink">{order.status}</span>
              )}
            </div>
            {/* status timeline */}
            <div className="mt-6 flex items-center gap-1">
              {steps.map((s, i) => (
                <div key={s} className="flex flex-1 items-center gap-1">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${i <= activeStep ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
                  {i < steps.length - 1 && <span className={`h-1 flex-1 rounded-full ${i < activeStep ? "bg-lime" : "bg-hairline"}`} />}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[12px] capitalize text-muted">
              {steps.map((s) => <span key={s}>{s}</span>)}
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
                    <p className="text-sm text-muted">Qty {l.qty ?? 1}</p>
                  </div>
                  <span className="font-medium text-ink">{inr(l.total ?? l.price ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>

          {order.deliveryAddress && (
            <div className="card rounded-[1.75rem] p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Delivery to</h2>
              <p className="mt-2 text-[15px] text-ink-soft">
                {[order.deliveryAddress.line1, order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.pincode].filter(Boolean).join(", ")}
                {order.deliveryAddress.phone ? ` · ${order.deliveryAddress.phone}` : ""}
              </p>
            </div>
          )}
        </div>

        <aside className="card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-semibold text-ink">Payment</h2>
          <dl className="mt-4 space-y-2.5 text-[15px]">
            {p.subtotal != null && <Row label="Subtotal" value={inr(p.subtotal)} />}
            {p.discount ? <Row label="Discount" value={`− ${inr(p.discount)}`} /> : null}
            {p.shipping != null && <Row label="Shipping" value={p.shipping ? inr(p.shipping) : "Free"} />}
            {p.tax ? <Row label="Tax" value={inr(p.tax)} /> : null}
            <div className="border-t border-hairline pt-2.5">
              <Row label="Total" value={inr(p.total ?? 0)} strong />
            </div>
          </dl>
          {order.payment?.method && (
            <p className="mt-3 text-sm text-muted">Paid via {order.payment.method} · {order.payment.status}</p>
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
