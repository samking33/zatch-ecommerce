import { variantText } from "@/lib/utils";
import { getUser } from "@/lib/client-auth";

/**
 * One call per shopper action, fanned out to every destination that needs it:
 * the Meta pixel, the matching Google Ads conversion action, and GA4 ecommerce.
 * Keeping the fan-out in here is what stops the three from drifting apart - the
 * pages just say what the shopper did.
 *
 * Both tags are bootstrapped in app/layout.tsx. They must stay synchronous
 * there: as deferred scripts they loaded after React's mount effects and these
 * calls silently did nothing on a cold page load.
 */

const GOOGLE_TAG_ID = "AW-18516509424";

// Google Ads conversion actions, one per funnel step (zatchmarketing@gmail.com).
const GCONV = {
  viewItem: `${GOOGLE_TAG_ID}/DF5ZCMy9yLIdEPCFrv1E`,
  addToCart: `${GOOGLE_TAG_ID}/pEZ-CMa9yLIdEPCFrv1E`,
  checkout: `${GOOGLE_TAG_ID}/hjrfCMm9yLIdEPCFrv1E`,
  purchase: `${GOOGLE_TAG_ID}/McqFCJ2LraQdEPCFrv1E`,
} as const;

const CURRENCY = "INR";

type Gtag = (command: string, event: string, params?: Record<string, unknown>) => void;
type Fbq = (command: string, event: string, params?: Record<string, unknown>, opts?: Record<string, unknown>) => void;

/** A product as the tags want it. `qty` defaults to 1. */
export type TrackItem = {
  id: string;
  name?: string;
  price?: number;
  qty?: number;
  category?: string;
  brand?: string;
  color?: string | null;
  size?: string | null;
};

export const toItem = (p: { _id: string; name?: string; price?: number; discountedPrice?: number; category?: string; brand?: string }, extra: Partial<TrackItem> = {}): TrackItem => ({
  id: p._id,
  name: p.name,
  price: p.discountedPrice ?? p.price,
  category: p.category,
  brand: p.brand,
  ...extra,
});

const qtyOf = (i: TrackItem) => i.qty ?? 1;
const valueOf = (items: TrackItem[]) => items.reduce((sum, i) => sum + (i.price ?? 0) * qtyOf(i), 0);

const ga4Items = (items: TrackItem[]) =>
  items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: qtyOf(i),
    item_category: i.category,
    item_brand: i.brand,
    item_variant: variantText(" / ", i.color, i.size) || undefined,
  }));

// Meta matches catalogue products on `contents`; `content_ids` stays for the
// older audience rules that still read it.
const metaContents = (items: TrackItem[]) => items.map((i) => ({ id: i.id, quantity: qtyOf(i), item_price: i.price }));

/**
 * Shared id so one action counts once even when it reaches Meta twice - from the
 * browser pixel and, later, from the server Conversions API. Purchases pass the
 * Razorpay order id so the server can derive the same value without being told.
 */
function eventId(seed?: string): string {
  if (seed) return seed;
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// The signed-in shopper, for attribution. Kept only in memory for this tab.
let identity: { email?: string; phone?: string } = {};
let identified = false;

/**
 * Who is shopping, so the ad platforms can attribute a sale to the click that
 * caused it. Google Enhanced Conversions hashes these in its tag; for Meta they
 * go to our own relay, which hashes them before they leave our server.
 * Called whenever the session user changes, including sign-out.
 */
export function identify(user: { email?: string; phone?: string; countryCode?: unknown } | null) {
  identified = true;
  const email = user?.email?.trim().toLowerCase() || undefined;
  // Same rule as the backend's Meta report (utils/metaCapi.js), so one shopper
  // hashes identically from both sides: country code + number, no leading zeros.
  const national = user?.phone?.replace(/\D/g, "").replace(/^0+/, "");
  // ponytail: assumes +91 when the stored user has no country code, since sign-up
  // defaults to India; read it from the profile if other countries are added.
  const cc = typeof user?.countryCode === "string" ? user.countryCode.replace(/\D/g, "") : "91";
  const phone = national ? `+${cc}${national}` : undefined;
  identity = { email, phone };

  const w = window as unknown as { gtag?: Gtag };
  if (typeof w.gtag === "function") w.gtag("set", "user_data", email || phone ? { email, phone_number: phone } : {});
}

/**
 * Send the same event server-side, where an ad blocker can't stop it. The id
 * matches the pixel's, so Meta counts one action rather than two. Fire and
 * forget: analytics must never delay or break the page.
 */
function relay(event: string, id: string, params: Record<string, unknown> = {}) {
  const w = window as unknown as { gtag?: Gtag; fbq?: Fbq };
  try {
    fetch("/api/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // px/gt say whether each tag was loaded when this fired; the tracking-health
      // panel turns them red if a tag starts loading too late again.
      body: JSON.stringify({ event, eventId: id, path: location.pathname, ...params, ...identity, px: typeof w.fbq === "function", gt: typeof w.gtag === "function" }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics is never worth an exception */
  }
}

function send(opts: {
  metaEvent: string;
  metaParams?: Record<string, unknown>;
  ga4Event: string;
  ga4Params?: Record<string, unknown>;
  sendTo?: string;
  conversion?: Record<string, unknown>;
  id?: string;
}): string {
  // React runs a page's effects before the auth provider's, so a page-load event
  // can fire before anyone has been identified. Pick up the stored session first.
  if (!identified) identify(getUser());

  const w = window as unknown as { gtag?: Gtag; fbq?: Fbq };
  const id = eventId(opts.id);

  if (typeof w.fbq === "function") {
    w.fbq("track", opts.metaEvent, opts.metaParams, { eventID: id });
  }
  relay(opts.metaEvent, id, opts.metaParams);
  if (typeof w.gtag === "function") {
    // No send_to, so this reaches every configured destination: GA4 for reporting
    // and the Ads tag, which reads the item ids for dynamic remarketing.
    w.gtag("event", opts.ga4Event, opts.ga4Params);
    // The conversion action is a separate event; only this one counts as a conversion.
    if (opts.sendTo) w.gtag("event", "conversion", { send_to: opts.sendTo, ...opts.conversion });
  }
  return id;
}

export function trackViewItem(item: TrackItem) {
  send({
    metaEvent: "ViewContent",
    metaParams: { content_type: "product", content_ids: [item.id], content_name: item.name, contents: metaContents([item]), value: item.price, currency: CURRENCY },
    ga4Event: "view_item",
    ga4Params: { currency: CURRENCY, value: item.price, items: ga4Items([item]) },
    sendTo: GCONV.viewItem,
  });
}

export function trackAddToCart(item: TrackItem) {
  const value = valueOf([item]);
  send({
    metaEvent: "AddToCart",
    metaParams: { content_type: "product", content_ids: [item.id], content_name: item.name, contents: metaContents([item]), value, currency: CURRENCY },
    ga4Event: "add_to_cart",
    ga4Params: { currency: CURRENCY, value, items: ga4Items([item]) },
    sendTo: GCONV.addToCart,
    conversion: { value, currency: CURRENCY },
  });
}

/** No Google Ads conversion action exists for saves, so this is Meta + GA4 only. */
export function trackAddToWishlist(item: TrackItem) {
  send({
    metaEvent: "AddToWishlist",
    metaParams: { content_type: "product", content_ids: [item.id], content_name: item.name, contents: metaContents([item]), value: item.price, currency: CURRENCY },
    ga4Event: "add_to_wishlist",
    ga4Params: { currency: CURRENCY, value: item.price, items: ga4Items([item]) },
  });
}

export function trackBeginCheckout(items: TrackItem[], total?: number) {
  const value = total ?? valueOf(items);
  send({
    metaEvent: "InitiateCheckout",
    metaParams: { content_type: "product", content_ids: items.map((i) => i.id), contents: metaContents(items), num_items: items.length, value, currency: CURRENCY },
    ga4Event: "begin_checkout",
    ga4Params: { currency: CURRENCY, value, items: ga4Items(items) },
    sendTo: GCONV.checkout,
    conversion: { value, currency: CURRENCY },
  });
}

/** Payment sheet opened. No Ads conversion action for this step, so Meta + GA4. */
export function trackAddPaymentInfo(items: TrackItem[], total?: number) {
  const value = total ?? valueOf(items);
  send({
    metaEvent: "AddPaymentInfo",
    metaParams: { content_type: "product", content_ids: items.map((i) => i.id), contents: metaContents(items), value, currency: CURRENCY },
    ga4Event: "add_payment_info",
    ga4Params: { currency: CURRENCY, value, items: ga4Items(items) },
  });
}

/**
 * A paid order, once. `transactionId` (the Razorpay order id) both dedupes a
 * reload for Google and pairs the pixel with the Conversions API for Meta.
 * `value` is in rupees; Razorpay quotes paise, so callers divide by 100.
 */
export function trackPurchase(transactionId: string, value?: number, currency = CURRENCY, items: TrackItem[] = []) {
  send({
    id: transactionId,
    metaEvent: "Purchase",
    metaParams: { content_type: "product", content_ids: items.map((i) => i.id), contents: metaContents(items), num_items: items.length || undefined, value, currency },
    ga4Event: "purchase",
    ga4Params: { transaction_id: transactionId, currency, value, items: ga4Items(items) },
    sendTo: GCONV.purchase,
    conversion: { transaction_id: transactionId, value, currency },
  });
}

export function trackSearch(term: string) {
  send({
    metaEvent: "Search",
    metaParams: { search_string: term },
    ga4Event: "search",
    ga4Params: { search_term: term },
  });
}

export function trackSignUp() {
  send({
    metaEvent: "CompleteRegistration",
    metaParams: { status: true },
    ga4Event: "sign_up",
    ga4Params: { method: "phone" },
  });
}
