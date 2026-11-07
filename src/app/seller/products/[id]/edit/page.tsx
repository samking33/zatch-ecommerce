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

  return (
    <SellerShell>
      <SellerHeader title="Edit product" sub={`${product.name}. Each step saves as you continue, so go through all four.`} />
      <CreateProduct categories={(cats as Category[] | null) ?? []} pickup={gate.shippingMethod === "zatch_pickup"} initial={product} />
    </SellerShell>
  );
}
