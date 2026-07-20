import Link from "next/link";
import { TrendingUp, Package, Tag, Wallet, Eye, ArrowUpRight, Boxes } from "lucide-react";
import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { orders as ordersApi, bargains as bargainsApi, payments as paymentsApi, products as productsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Product } from "@/lib/types";

export const metadata = { title: "Seller dashboard" };

type Perf = { totalRevenue?: string; totalOrders?: number; pendingOrders?: number; readyToShip?: number; productViews?: number };
type OrdersDash = { performanceSummary?: Perf; topCards?: { totalProducts?: number; totalProductViews?: number } };
type BargainDash = { stats?: { totalBargains?: number; pendingBargains?: number; activeCount?: number } };
type PaySummary = { totalRevenueFormatted?: string; netRevenueFormatted?: string; pendingFormatted?: string };

export default async function SellerDashboardPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your seller dashboard" /></div></SellerShell>;

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
    { icon: Tag, label: "Bargains", value: String(stats.totalBargains ?? 0), sub: `${stats.pendingBargains ?? 0} to reply` },
    { icon: Wallet, label: "Payout due", value: pay?.pendingFormatted ?? "₹0" },
    { icon: Eye, label: "Views", value: String(perf.productViews ?? oDash?.topCards?.totalProductViews ?? 0) },
    { icon: Boxes, label: "Products", value: String(oDash?.topCards?.totalProducts ?? products.length) },
  ];

  return (
    <SellerShell>
      <SellerHeader
        title="Dashboard"
        sub="Your storefront performance at a glance."
        action={
          <Link href="/seller/products/new" className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            <ArrowUpRight className="h-4 w-4" /> Add product
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="card rounded-[1.5rem] p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-ink"><k.icon className="h-[18px] w-[18px]" /></span>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{k.value}</p>
            <p className="text-[13px] text-muted">{k.label}{k.sub ? ` · ${k.sub}` : ""}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between px-1">
        <h2 className="font-display text-xl font-semibold text-ink">Your products</h2>
        <Link href="/seller/products" className="text-sm font-medium text-ink hover:underline">Manage all →</Link>
      </div>
      {products.length === 0 ? (
        <div className="card mt-3 grid place-items-center rounded-[2rem] px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-ink">No products yet</p>
          <p className="mt-2 text-muted">List your first product to start selling.</p>
          <Link href="/seller/products/new" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Add a product</Link>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {products.slice(0, 12).map((p) => (
            <Link key={p._id} href={`/product/${p._id}`} className="card card-hover overflow-hidden rounded-2xl p-2">
              <div className="aspect-square overflow-hidden rounded-xl bg-surface-2">
                <ProductMedia src={p.images?.[0]?.url} alt={p.name} sizes="150px" className="h-full w-full" />
              </div>
              <p className="line-clamp-1 px-1 pt-2 text-[13px] font-medium text-ink">{p.name}</p>
            </Link>
          ))}
        </div>
      )}
    </SellerShell>
  );
}
