"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cart as cartApi, apiError } from "@/lib/api";
import { trackAddToCart, toItem } from "@/lib/analytics";
import { getToken } from "@/lib/client-auth";
import { buyHref } from "@/lib/checkout-link";
import type { Product, Variant } from "@/lib/types";

/** Colour, size and quantity choice plus Add to cart / Buy now for one product, shared by the
 *  product page and the "Shop this video" panel. `bitId` credits a cart add to that video. */
export function useVariantPicker(product: Product, bitId?: string) {
  const router = useRouter();
  const variants = useMemo(() => product.variants ?? [], [product.variants]);

  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean) as string[])],
    [variants],
  );
  const [color, setColor] = useState<string | undefined>(colors[0]);
  // Some products store a placeholder colour "none"; it is still sent to the cart but not shown as a choice.
  const shownColors = colors.filter((c) => c.toLowerCase() !== "none");

  const sizes = useMemo(
    () =>
      [
        ...new Set(
          variants
            .filter((v) => (color ? v.color === color : true))
            .map((v) => v.size)
            .filter((s): s is string => !!s && s.toLowerCase() !== "none"),
        ),
      ],
    [variants, color],
  );
  const [size, setSize] = useState<string | undefined>(sizes[0]);

  // Per-variant availability - backend sends isOutOfStock/stock on each combo.
  const soldOut = (v?: Variant) => !!v && (v.isOutOfStock === true || v.stock === 0);
  const colorSoldOut = (c: string) => variants.filter((v) => v.color === c).every((v) => soldOut(v));
  const sizeSoldOut = (s: string) =>
    variants.filter((v) => (color ? v.color === color : true) && v.size === s).every((v) => soldOut(v));
  const selected = variants.find((v) => (color ? v.color === color : true) && (size ? v.size === size : true));
  // A product with no variants can never be added to a cart (the server matches a variant), so it is unavailable.
  const unavailable = variants.length === 0;
  const outOfStock = unavailable || soldOut(selected);
  // A size must be picked; without one the server would match any size of that colour.
  const needsSize = sizes.length > 0 && !size;
  // What the server stored for this variant: the picked size, or its hidden placeholder ("NONE").
  // The server matches the stored text exactly, so sending nothing fails with "Size is required".
  const sendSize = size ?? selected?.size;
  const [qty, setQty] = useState(1);
  const maxQty = Math.max(1, selected?.stock ?? 1);

  function pickColor(c: string) {
    setColor(c);
    // Keep the buyer's size when the new colour has it in stock.
    setSize((s) => (s && variants.some((v) => v.color === c && v.size === s && !soldOut(v)) ? s : undefined));
    setQty(1);
  }
  function pickSize(s: string) { setSize(s); setQty(1); }

  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [cartError, setCartError] = useState<string | null>(null);
  async function addToCart() {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    setStatus("adding");
    const res = await cartApi.update({ productId: product._id, color, size: sendSize, qty, ...(bitId ? { bitId } : {}) }, token);
    const failure = apiError(res, "Couldn't add to cart. Try again.");
    setCartError(failure);
    setStatus(failure ? "error" : "added");
    if (!failure) trackAddToCart(toItem(product, { qty, color, size: sendSize }));
  }

  // Buy now goes straight to checkout with this item; the cart is left alone (same as the app).
  function buyNow() {
    router.push(buyHref([{ productId: product._id, variantColor: color ?? "", variantSize: sendSize ?? "", qty }]));
  }

  return {
    variants, color, shownColors, sizes, size, colorSoldOut, sizeSoldOut, selected,
    unavailable, outOfStock, needsSize, sendSize, qty, setQty, maxQty, pickColor, pickSize,
    status, cartError, addToCart, buyNow,
  };
}
