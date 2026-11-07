"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, ShoppingBag, Zap } from "lucide-react";
import { useVariantPicker } from "@/components/product/use-variant-picker";
import { catalog } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import type { Product } from "@/lib/types";

/** Buy a tagged product without leaving the video: the Bits feed only carries a product's name,
 *  price and one photo, so its variants are loaded here. Offers stay on the product page. */
export function QuickBuy({ productId, bitId }: { productId: string; bitId: string }) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    catalog.product(productId, getToken()).then((p) => { if (alive) setProduct(p); });
    return () => { alive = false; };
  }, [productId]);

  if (product === undefined) return <p className="flex items-center gap-2 px-1 py-2 text-[13px] text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading options…</p>;
  if (!product) return <Link href={`/product/${productId}`} className="block px-1 py-2 text-[13px] font-medium text-ink underline underline-offset-4">See product</Link>;
  return <Picker product={product} bitId={bitId} />;
}

function Picker({ product, bitId }: { product: Product; bitId: string }) {
  const v = useVariantPicker(product, bitId);
  const chip = (on: boolean, off: boolean) =>
    `rounded-full border px-3 py-1.5 text-[12px] font-medium capitalize transition ${on ? "border-ink bg-ink text-surface" : "border-hairline bg-surface-2 text-ink hover:border-ink"} ${off ? "cursor-not-allowed line-through opacity-40" : ""}`;

  if (product.myProduct) return null;
  return (
    <div className="space-y-2.5 px-1 pb-1 pt-2">
      {v.shownColors.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colour">
          {v.shownColors.map((c) => (
            <button key={c} type="button" onClick={() => v.pickColor(c)} disabled={v.colorSoldOut(c)} aria-pressed={c === v.color} className={chip(c === v.color, v.colorSoldOut(c))}>{c}</button>
          ))}
        </div>
      )}
      {v.sizes.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Size">
          {v.sizes.map((s) => (
            <button key={s} type="button" onClick={() => v.pickSize(s)} disabled={v.sizeSoldOut(s)} aria-pressed={s === v.size} className={chip(s === v.size, v.sizeSoldOut(s))}>{s.toLowerCase()}</button>
          ))}
        </div>
      )}
      {v.status === "added" ? (
        <div className="flex items-center gap-2 rounded-full bg-lime px-3 py-2 text-[13px] font-semibold text-lime-ink">
          <Check className="h-4 w-4" /> Added
          <Link href="/cart" className="btn-ink ml-auto rounded-full px-3.5 py-1.5 text-[12px] font-semibold">View cart</Link>
        </div>
      ) : v.outOfStock ? (
        <p className="text-[13px] font-medium text-muted">{v.unavailable ? "Not available yet" : "Sold out"}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={v.addToCart} disabled={v.status === "adding" || v.needsSize} className="btn-ink inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold disabled:opacity-50">
            {v.status === "adding" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />} Add to cart
          </button>
          <button onClick={v.buyNow} disabled={v.status === "adding" || v.needsSize} className="pill-lime inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold disabled:opacity-50">
            <Zap className="h-4 w-4" /> Buy now
          </button>
        </div>
      )}
      {v.needsSize && !v.outOfStock && <p className="text-[12px] text-muted">Choose a size first.</p>}
      {v.status === "error" && <p role="alert" className="text-[12px] font-medium text-live">{v.cartError}</p>}
      <Link href={`/product/${product._id}`} className="inline-block text-[12px] font-medium text-muted underline underline-offset-4 hover:text-ink">Details and offers</Link>
    </div>
  );
}
