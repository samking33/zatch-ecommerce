import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { CreateProduct } from "@/components/seller/create-product";
import { categories as categoriesApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Category } from "@/lib/types";

export const metadata = { title: "Seller · Add product" };

export default async function NewProductPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="the product studio" /></div></SellerShell>;

  const cats = ((await categoriesApi.list()) as Category[] | null) ?? [];

  return (
    <SellerShell>
      <SellerHeader title="Add product" sub="Three quick steps — basics, colours, images." />
      <CreateProduct categories={cats} />
    </SellerShell>
  );
}
