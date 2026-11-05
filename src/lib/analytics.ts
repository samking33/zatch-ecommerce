// Purchase tracking for Google Ads and the Meta Pixel. Both tags are loaded once in
// app/layout.tsx (AW-18516509424 and Meta Pixel 1421438440165577); this fires their
// purchase/conversion event on a completed order.
// Google Ads conversion actions, one per funnel step (zatchmarketing@gmail.com).
const PURCHASE_SEND_TO = "AW-18516509424/McqFCJ2LraQdEPCFrv1E";
export const GCONV = {
  viewContent: "AW-18516509424/DF5ZCMy9yLIdEPCFrv1E",
  addToCart: "AW-18516509424/pEZ-CMa9yLIdEPCFrv1E",
  checkout: "AW-18516509424/hjrfCMm9yLIdEPCFrv1E",
} as const;

type Gtag = (command: string, event: string, params: Record<string, unknown>) => void;
type Fbq = (command: string, event: string, params?: Record<string, unknown>, opts?: Record<string, unknown>) => void;

/**
 * Report a paid order to Google Ads and Meta, once per order.
 * `transactionId` (the Razorpay order id) dedupes if the page is reloaded (Google)
 * and across pixel + Conversions API (Meta eventID).
 * `value` is in rupees; Razorpay quotes paise, so callers divide by 100.
 */
export function trackPurchase(transactionId: string, value?: number, currency = "INR") {
  const w = window as unknown as { gtag?: Gtag; fbq?: Fbq };
  const money = typeof value === "number" ? { value, currency } : {};

  if (typeof w.gtag === "function") {
    w.gtag("event", "conversion", { send_to: PURCHASE_SEND_TO, transaction_id: transactionId, ...money });
  }
  if (typeof w.fbq === "function") {
    w.fbq("track", "Purchase", money, { eventID: transactionId });
  }
}

/**
 * Fire a Meta Pixel standard event (ViewContent, AddToCart, AddToWishlist,
 * InitiateCheckout, AddPaymentInfo, CompleteRegistration, Search).
 */
export function trackMeta(event: string, params?: Record<string, unknown>) {
  const w = window as unknown as { fbq?: Fbq };
  if (typeof w.fbq === "function") w.fbq("track", event, params);
}

/** Fire one Google Ads conversion action (a GCONV send_to). `value` is in rupees. */
export function trackGoogleConversion(sendTo: string, value?: number, currency = "INR") {
  const w = window as unknown as { gtag?: Gtag };
  const money = typeof value === "number" ? { value, currency } : {};
  if (typeof w.gtag === "function") w.gtag("event", "conversion", { send_to: sendTo, ...money });
}
