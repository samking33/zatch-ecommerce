// Google Ads conversion tracking. The Google tag itself (AW-18516509424) is loaded
// once in app/layout.tsx; this fires the "Purchase" conversion event on a completed order.
// Conversion action shared by the Google Ads account (zatchmarketing@gmail.com).
const PURCHASE_SEND_TO = "AW-18516509424/McqFCJ2LraQdEPCFrv1E";

type Gtag = (command: string, event: string, params: Record<string, unknown>) => void;

/**
 * Report a paid order to Google Ads, once per order.
 * `transactionId` (the Razorpay order id) lets Google dedupe if the page is reloaded.
 * `value` is in rupees; Razorpay quotes paise, so callers divide by 100.
 */
export function trackPurchase(transactionId: string, value?: number, currency = "INR") {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return; // the tag is blocked or still loading
  gtag("event", "conversion", {
    send_to: PURCHASE_SEND_TO,
    transaction_id: transactionId,
    ...(typeof value === "number" ? { value, currency } : {}),
  });
}
