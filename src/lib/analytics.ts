// Purchase tracking for Google Ads and the Meta Pixel. Both tags are loaded once in
// app/layout.tsx (AW-18516509424 and Meta Pixel 1421438440165577); this fires their
// purchase/conversion event on a completed order.
// Google Ads conversion action shared by the account (zatchmarketing@gmail.com).
const PURCHASE_SEND_TO = "AW-18516509424/McqFCJ2LraQdEPCFrv1E";

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
 * InitiateCheckout, AddPaymentInfo, CompleteRegistration, Search). The purchase
 * conversion stays in trackPurchase; these are Meta-only because Google Ads has a
 * conversion action configured for the purchase alone.
 */
export function trackMeta(event: string, params?: Record<string, unknown>) {
  const w = window as unknown as { fbq?: Fbq };
  if (typeof w.fbq === "function") w.fbq("track", event, params);
}
