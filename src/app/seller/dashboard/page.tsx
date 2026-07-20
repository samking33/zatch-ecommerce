import Link from "next/link";
import { TrendingUp, Package, Tag, Wallet, Eye, ArrowUpRight, Radio } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { orders as ordersApi, bargains as bargainsApi, payments as paymentsApi, products as productsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Product } from "@/lib/types";

export const metadata = { title: "Seller dashboard" };

type Perf = { totalRevenue?: string; totalOrders?: number; pendingOrders?: number; readyToShip?: number; productViews?: number };
type OrdersDash = { performanceSummary?: Perf; topCards?: { totalProducts?: number; totalBuyBits?: number; totalProductViews?: number }; orders?: unknown[] };
type BargainDash = { stats?: { totalBargains?: number; acceptedBargains?: number; pendingBargains?: number; activeCount?: number } };
type PaySummary = { totalRevenueFormatted?: string; netRevenueFormatted?: string; pendingFormatted?: string };

export default async function SellerDashboardPage() {
  const t = await serverToken();
  if (!t) {
    return (
      <PageShell>
        <div className="pt-6"><SignInRequired what="your seller dashboard" /></div>
      </PageShell>
    );
  }

  const [oDash, bDash, pay, myProducts] = await Promise.all([
    ordersApi.sellerDashboard(t) as Promise<OrdersDash | null>,
    bargainsApi.sellerDashboard(t) as Promise<BargainDash | null>,
    paymentsApi.summary(t) as Promise<PaySummary | null>,
    productsApi.myProducts(t) as Promise<Product[] | null>,
  ]);

  const perf = oDash?.performanceSummary ?? {};
  const stats = bDash?.stats ?? {};
  const products = myProducts ?? [];

  const kpis = [
    { icon: TrendingUp, label: "Revenue", value: perf.totalRevenue ?? pay?.totalRevenueFormatted ?? "₹0" },
    { icon: Package, label: "Orders", value: String(perf.totalOrders ?? 0), sub: `${perf.pendingOrders ?? 0} pending` },
    { icon: Tag, label: "Bargains", value: String(stats.totalBargains ?? 0), sub: `${stats.activeCount ?? 0} active` },
    { icon: Wallet, label: "Payout due", value: pay?.pendingFormatted ?? "₹0" },
    { icon: Eye, label: "Product views", value: String(perf.productViews ?? oDash?.topCards?.totalProductViews ?? 0) },
    { icon: Package, label: "Products", value: String(oDash?.topCards?.totalProducts ?? products.length) },
  ];

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="Seller" title="Dashboard" sub="Your storefront performance at a glance." />
        <div className="flex gap-2 pb-2">
          <Link href="/sell" className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-2">
            <Radio className="h-4 w-4" /> Go live
          </Link>
          <Link href="/sell" className="pill-lime inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold">
            <ArrowUpRight className="h-4 w-4" /> Add product
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="card rounded-[1.5rem] p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-ink">
              <k.icon className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{k.value}</p>
            <p className="text-[13px] text-muted">{k.label}{k.sub ? ` · ${k.sub}` : ""}</p>
          </div>
        ))}
      </div>

      {/* nav to detail lists */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <DashLink href="/seller/dashboard" icon={Package} title="Orders" desc={`${perf.totalOrders ?? 0} total · ${perf.readyToShip ?? 0} to ship`} />
        <DashLink href="/bargains" icon={Tag} title="Bargains" desc={`${stats.pendingBargains ?? 0} awaiting your reply`} />
        <DashLink href="/seller/dashboard" icon={Wallet} title="Payouts" desc={`Net ${pay?.netRevenueFormatted ?? "₹0"}`} />
      </div>

      {/* my products */}
      <div className="mt-8">
        <h2 className="px-1 font-display text-xl font-semibold text-ink">Your products</h2>
        {products.length === 0 ? (
          <div className="card mt-3 grid place-items-center rounded-[2rem] px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink">No products yet</p>
            <p className="mt-2 text-muted">List your first product to start selling.</p>
            <Link href="/sell" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Add a product</Link>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {products.map((p, i) => (
              <Link key={p._id} href={`/product/${p._id}`} className="card card-hover overflow-hidden rounded-2xl p-2">
                <div className="aspect-square overflow-hidden rounded-xl bg-surface-2">
                  <ProductMedia src={p.images?.[0]?.url} alt={p.name} sizes="150px" className="h-full w-full" />
                </div>
                <p className="line-clamp-1 px-1 pt-2 text-[13px] font-medium text-ink">{p.name}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function DashLink({ href, icon: Icon, title, desc }: { href: string; icon: typeof Package; title: string; desc: string }) {
  return (
    <Link href={href} className="card card-hover flex items-center gap-3 rounded-[1.5rem] p-5">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-surface"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{desc}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted" />
    </Link>
  );
}
