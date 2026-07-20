import Link from "next/link";
import { Plus } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductManage } from "@/components/seller/product-manage";
import { products as productsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Product } from "@/lib/types";

export const metadata = { title: "Seller · Products" };

export default async function SellerProductsPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your products" /></div></SellerShell>;

  const list = ((await productsApi.myProducts(t)) as (Product & { status?: string })[] | null) ?? [];

  return (
    <SellerShell>
      <SellerHeader
        title="Products"
        sub={`${list.length} listing${list.length !== 1 ? "s" : ""}`}
        action={
          <Link href="/seller/products/new" className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Add product
          </Link>
        }
      />
      {list.length === 0 ? (
        <EmptyState
          title="No products yet"
          sub="List your first product — set a price and a bargain range, and you're live."
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
