import Link from "next/link";
import { Package } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { orders as ordersApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { inr } from "@/lib/utils";

export const metadata = { title: "My orders" };

type OrderLine = { name?: string; image?: string; qty?: number; total?: number; price?: number };
type Order = {
  _id: string;
  orderId?: string;
  status?: string;
  createdAt?: string;
  product?: OrderLine;
  items?: OrderLine[];
  pricing?: { total?: number };
};

export default async function OrdersPage() {
  const t = await serverToken();
  if (!t) {
    return (
      <PageShell>
        <div className="pt-6">
          <SignInRequired what="your orders" />
        </div>
      </PageShell>
    );
  }

  const data = (await ordersApi.myOrders(t)) as Order[] | null;
  const list = Array.isArray(data) ? data : [];

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="My orders" />
      {list.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((o) => {
            const line = o.product ?? o.items?.[0] ?? {};
            const total = o.pricing?.total ?? line.total ?? 0;
            return (
              <Link
                key={o._id}
                href={`/orders/${o._id}`}
                className="card card-hover flex items-center gap-4 rounded-[1.5rem] p-3"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                  <ProductMedia src={line.image} alt={line.name ?? "Order"} sizes="80px" className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">
                    {line.name ?? `Order ${o.orderId ?? o._id.slice(-6)}`}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    #{o.orderId ?? o._id.slice(-6)}
                    {line.qty ? ` · Qty ${line.qty}` : ""}
                  </p>
                  {o.status && (
                    <span className="mt-1.5 inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium capitalize text-ink">
                      {o.status}
                    </span>
                  )}
                </div>
                <span className="font-display text-lg font-semibold text-ink">{inr(total)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function EmptyOrders() {
  return (
    <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
        <Package className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-ink">No orders yet</h2>
      <p className="mt-2 text-muted">When you strike a deal, it shows up here.</p>
      <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
        Start shopping
      </Link>
    </div>
  );
}
