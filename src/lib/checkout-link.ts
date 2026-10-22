// Direct checkout ("Buy now", "Pay" on an accepted bargain, "Buy again"): the items go to
// /checkout in the URL and are priced by the server without touching the cart, the same
// `items` contract the app sends to /checkout/initiate and /checkout/payment/razorpay/initiate.
export type BuyItem = { productId: string; variantColor: string; variantSize: string; qty: number; bargainId?: string };

export function buyHref(items: BuyItem[]): string {
  return `/checkout?${new URLSearchParams({ items: JSON.stringify(items) })}`;
}

const MONGO_ID = /^[a-f\d]{24}$/i;

/** Reads `items` from the URL. Anything malformed is dropped; the server re-checks stock and prices. */
export function parseBuyItems(raw: string | null): BuyItem[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.flatMap((x) => {
      const i = x as Partial<BuyItem>;
      const qty = Number(i.qty);
      if (typeof i.productId !== "string" || !MONGO_ID.test(i.productId)) return [];
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) return [];
      return [{
        productId: i.productId,
        variantColor: String(i.variantColor ?? ""),
        variantSize: String(i.variantSize ?? ""),
        qty,
        ...(typeof i.bargainId === "string" && MONGO_ID.test(i.bargainId) ? { bargainId: i.bargainId } : {}),
      }];
    });
  } catch {
    return [];
  }
}
