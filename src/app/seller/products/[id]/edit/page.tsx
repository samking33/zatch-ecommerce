import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { CreateProduct, type EditableProduct } from "@/components/seller/create-product";
import { api, categories as categoriesApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import type { Category } from "@/lib/types";

export const metadata = { title: "Seller · Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your products" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { id } = await params;
  // The seller's own list holds the full saved product (variants, photos, shipping), and only
  // ever their own, so an id from someone else's shop simply isn't found.
  const [mine, cats] = await Promise.all([
    api<{ products?: EditableProduct[] }>("/product/seller/my-products", { token: t, raw: true, revalidate: 0 }),
    categoriesApi.list(),
  ]);
  const product = mine?.products?.find((p) => p._id === id);
  if (!product) notFound();

  // During Zatch Hours the list sends the event price as `discountedPrice`. Saving the form would
  // keep it after the event ends (create-v3, the pickup route, doesn't skip it), so wait it out.
  if ((product.specialHourPercent ?? 0) > 0) {
    return (
      <SellerShell>
        <SellerHeader title="Edit product" sub={product.name} />
        <div className="card grid place-items-center rounded-[1.5rem] px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-ink">Zatch Hours is on for your shop</p>
          <p className="mt-2 max-w-md text-sm text-muted">Prices show the event discount right now, so editing waits until it ends. Try again after the event.</p>
          <Link href="/seller/products" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Back to products</Link>
        </div>
      </SellerShell>
    );
  }

  return (
    <SellerShell>
      <SellerHeader title="Edit product" sub={`${product.name}. Each step saves as you continue, so go through all four.`} />
      <CreateProduct categories={(cats as Category[] | null) ?? []} pickup={gate.shippingMethod === "zatch_pickup"} initial={product} />
    </SellerShell>
  );
}
