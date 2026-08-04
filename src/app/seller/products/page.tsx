import Link from "next/link";
import { Plus } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductManage } from "@/components/seller/product-manage";
import { products as productsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import type { Product } from "@/lib/types";

export const metadata = { title: "Seller · Products" };

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your products" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { q = "" } = await searchParams;
  const list = ((q
    ? await productsApi.searchMine(q, t)
    : await productsApi.myProducts(t)) as (Product & { status?: string })[] | null) ?? [];

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

      <SellerHeader
        title="Products"
        sub={q ? `${list.length} match${list.length !== 1 ? "es" : ""} for “${q}”` : `${list.length} listing${list.length !== 1 ? "s" : ""}`}
        action={
          <Link href="/seller/products/new" className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add product
          </Link>
        }
      />
      {list.length === 0 ? (
        <EmptyState
          title="No products yet"
          sub="List your first product - set a price and a bargain range, and you're live."
          cta={<Link href="/seller/products/new" className="pill-lime rounded-full px-6 py-3 text-sm font-semibold">Add a product</Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((p) => <ProductManage key={p._id} product={p} />)}
        </div>
      )}
    </SellerShell>
  );
}
