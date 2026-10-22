import Link from "next/link";
import { Plus } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductManage } from "@/components/seller/product-manage";
import { api, products as productsApi, users } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import type { Product } from "@/lib/types";

export const metadata = { title: "Seller · Products" };

type Listing = Product & { status?: string };
// The app's inventory filters and sorts. The server sorts by price and stock; A to Z is done here.
const STOCK = [
  { key: "", label: "All" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
];
const SORTS = [
  { key: "", label: "Newest" },
  { key: "az", label: "A to Z" },
  { key: "stock_low", label: "Stock: low first" },
  { key: "price_desc", label: "Price: high first" },
];

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stock?: string; sort?: string; added?: string }>;
}) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your products" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { q = "", stock = "", sort = "", added = "" } = await searchParams;
  const serverSort = sort === "stock_low" || sort === "price_desc" ? sort : undefined;
  const [mine, me] = await Promise.all([
    q
      ? productsApi.searchMine(q, t).then((r) => ({ products: (r as Listing[] | null) ?? [] }))
      : api<{ products?: Listing[]; inventoryStats?: { lowStockThreshold?: number } }>(
          `/product/seller/my-products${serverSort ? `?sortBy=${serverSort}` : ""}`, { token: t, raw: true, revalidate: 0 }),
    users.profile(t),
  ]);
  const all = mine?.products ?? [];
  const threshold = (mine as { inventoryStats?: { lowStockThreshold?: number } } | null)?.inventoryStats?.lowStockThreshold ?? 5;
  const stockOf = (p: Listing) => p.totalStock ?? 0;
  const list = all
    .filter((p) => (stock === "out" ? stockOf(p) === 0 : stock === "low" ? stockOf(p) > 0 && stockOf(p) <= threshold : true))
    .sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name) : 0));
  const href = (k: string, v: string) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(stock && { stock }), ...(sort && { sort }) });
    if (v) p.set(k, v); else p.delete(k);
    const qs = p.toString();
    return `/seller/products${qs ? `?${qs}` : ""}`;
  };
  const chip = (on: boolean) => `rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${on ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`;
  // The server only lets admins feature a product as a top pick.
  const canTopPick = (me as { isAdmin?: boolean } | null)?.isAdmin === true;

  return (
    <SellerShell>
      <form action="/seller/products" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search your products…"
          className="h-11 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button type="submit" className="btn-ink rounded-full px-5 text-sm font-semibold">Search</button>
        {q && <Link href="/seller/products" className="grid place-items-center rounded-full border border-hairline px-4 text-sm text-muted hover:text-ink">Clear</Link>}
      </form>

      {/* The app's "Product added" screen: confirm and offer the next steps. */}
      {/^[a-f\d]{24}$/i.test(added) && (
        <div role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-[1.5rem] bg-lime px-5 py-4 text-lime-ink">
          <p className="flex-1 font-semibold">Product published. Buyers can see it now.</p>
          <Link href={`/product/${added}`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface">View product</Link>
          <Link href="/seller/products/new" className="rounded-full border border-lime-ink/30 px-4 py-2 text-sm font-semibold">Add another</Link>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted">Stock</span>
        {STOCK.map((x) => <Link key={x.key} href={href("stock", x.key)} className={chip((stock || "") === x.key)}>{x.label}</Link>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted">Sort</span>
        {SORTS.map((x) => <Link key={x.key} href={href("sort", x.key)} className={chip((sort || "") === x.key)}>{x.label}</Link>)}
      </div>

      <SellerHeader
        title="Products"
        sub={q ? `${list.length} match${list.length !== 1 ? "es" : ""} for “${q}”` : `${list.length} listing${list.length !== 1 ? "s" : ""}`}
        action={
          <Link href="/seller/products/new" className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add product
          </Link>
        }
      />
      {list.length === 0 && all.length > 0 ? (
        <EmptyState
          title="Nothing matches"
          sub="No products match this filter."
          cta={<Link href="/seller/products" className="pill-lime rounded-full px-6 py-3 text-sm font-semibold">Show all</Link>}
        />
      ) : list.length === 0 ? (
        <EmptyState
          title="No products yet"
          sub="List your first product - set a price and a bargain range, and you're live."
          cta={<Link href="/seller/products/new" className="pill-lime rounded-full px-6 py-3 text-sm font-semibold">Add a product</Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Keyed by status so a row re-syncs when the server's value changes (e.g. edited in the app). */}
          {list.map((p) => <ProductManage key={`${p._id}-${p.status}-${p.isTopPick}`} product={p} canTopPick={canTopPick} />)}
        </div>
      )}
    </SellerShell>
  );
}
