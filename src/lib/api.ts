import type { Product, Category, LiveSession, Bit } from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Opts = {
  method?: Method;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  revalidate?: number; // GET only; ignored for mutations
  pick?: string; // envelope key holding the payload, e.g. "products"
  raw?: boolean; // return the whole JSON envelope, no unwrap (dashboards)
};

/**
 * Single wrapper over the zatch-main REST API (`/api/v1`). Handles reads and
 * mutations, attaches the JWT when given, and never throws — returns null so
 * pages degrade to placeholder data instead of 500-ing when the backend is
 * down. ponytail: one helper, no per-endpoint client classes.
 */
// zatch-main gates most read endpoints behind a JWT. Set ZATCH_API_TOKEN
// (server-side) to a valid token and every call is authorized by default.
const DEFAULT_TOKEN = process.env.ZATCH_API_TOKEN;

// Envelope keys the backend uses instead of a uniform `{ data }` wrapper.
const META_KEYS = new Set(["success", "message", "code", "status", "error"]);

// Pagination/meta fields the backend mixes into list envelopes alongside the
// actual payload key — ignored when guessing which key holds the data.
const PAGING_KEYS = new Set([
  "page", "limit", "total", "count", "hasMore", "hasNext", "hasPrev",
  "pagination", "totalCount", "totalPages", "currentPage", "unreadCount",
  "summary", "action", "refreshToken",
]);

function unwrap<T>(json: unknown, pick?: string): T {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    if (pick && pick in obj) return obj[pick] as T;
    if ("data" in obj) return obj.data as T;
    const payloadKeys = Object.keys(obj).filter(
      (k) => !META_KEYS.has(k) && !PAGING_KEYS.has(k),
    );
    if (payloadKeys.length === 1) return obj[payloadKeys[0]] as T;
    // Multiple candidates (e.g. { orders, bargains }) — prefer the first array.
    const arrayKey = payloadKeys.find((k) => Array.isArray(obj[k]));
    if (arrayKey) return obj[arrayKey] as T;
  }
  return json as T;
}

export async function api<T>(path: string, opts: Opts = {}): Promise<T | null> {
  const { method = "GET", body, token = DEFAULT_TOKEN, headers = {}, revalidate = 60, pick, raw } = opts;
  const isRead = method === "GET";
  try {
    const res = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(isRead
        ? { next: { revalidate } }
        : { cache: "no-store" as RequestCache }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (json && typeof json === "object" && "success" in json && json.success === false) {
      return null;
    }
    return raw ? (json as T) : unwrap<T>(json, pick);
  } catch {
    return null;
  }
}

const qs = (o?: Record<string, string | number | undefined>) => {
  if (!o) return "";
  const p = Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return p ? `?${p}` : "";
};

// ─── Auth & OTP (/user, /otp, /twilio-sms, /email) ──────────────────────────
export const auth = {
  register: (b: unknown) => api("/user/register", { method: "POST", body: b }),
  login: (b: unknown) => api("/user/login", { method: "POST", body: b }),
  logout: (t: string) => api("/user/logout", { method: "POST", token: t }),
  changePassword: (b: unknown, t: string) =>
    api("/user/change-password", { method: "PUT", body: b, token: t }),
  deleteAccount: (t: string) =>
    api("/user/delete-account", { method: "DELETE", token: t }),
  // OTP (phone + email combined, or individually)
  sendBothOtp: (b: unknown) => api("/otp/send-both", { method: "POST", body: b }),
  verifyBothOtp: (b: unknown) => api("/otp/verify-both", { method: "POST", body: b }),
  sendSmsOtp: (b: unknown) => api("/twilio-sms/send-otp", { method: "POST", body: b }),
  verifySmsOtp: (b: unknown) => api("/twilio-sms/verify-otp", { method: "POST", body: b }),
  sendEmailOtp: (b: unknown) => api("/email/send-email-otp", { method: "POST", body: b }),
  verifyEmailOtp: (b: unknown) => api("/email/verify-email-otp", { method: "POST", body: b }),
  // Forgot password
  forgotSendOtp: (b: unknown) =>
    api("/user/forgot-password/send-otp", { method: "POST", body: b }),
  forgotVerifyOtp: (b: unknown) =>
    api("/user/forgot-password/verify-otp", { method: "POST", body: b }),
  forgotReset: (b: unknown) =>
    api("/user/forgot-password/reset", { method: "POST", body: b }),
  forgotVerifyAndReset: (b: unknown) =>
    api("/user/forgot-password/verify-and-reset", { method: "POST", body: b }),
};

// ─── User & profiles (/user) ────────────────────────────────────────────────
export const users = {
  profile: (t: string) => api("/user/profile", { token: t, pick: "user" }),
  updateProfile: (b: unknown, t: string) =>
    api("/user/profile-update", { method: "PUT", body: b, token: t }),
  publicProfile: (userId: string) => api(`/user/profile/${userId}`),
  shareProfile: (userId: string) => api(`/user/share-profile/${userId}`),
  all: (t: string) => api("/user/all-users", { token: t }),
  searchHistory: (t: string) => api("/user/search-history", { token: t }),
  follow: (b: unknown, t: string) => api("/user/follow", { method: "POST", body: b, token: t }),
  unfollow: (b: unknown, t: string) => api("/user/unfollow", { method: "POST", body: b, token: t }),
  toggleFollow: (targetUserId: string, t: string) =>
    api(`/user/${targetUserId}/toggleFollow`, { method: "POST", token: t }),
  review: (b: unknown, t: string) => api("/user/review", { method: "POST", body: b, token: t }),
};

// ─── Seller onboarding & status (/user/seller) ──────────────────────────────
export const seller = {
  register: (b: unknown, t: string) =>
    api("/user/seller/register", { method: "POST", body: b, token: t }),
  approve: (b: unknown, t: string) =>
    api("/user/seller/approve", { method: "POST", body: b, token: t }),
  status: (t: string) => api("/user/seller/status", { token: t }),
  terms: () => api("/user/seller/terms-and-conditions"),
  profileCompletion: (t: string) => api("/user/seller/profile-completion", { token: t }),
  benefits: (t: string) => api("/user/seller/benefits", { token: t }),
  recordSale: (b: unknown, t: string) =>
    api("/user/record-sale", { method: "POST", body: b, token: t }),
};

// ─── Products (/product) ────────────────────────────────────────────────────
export const products = {
  list: (o?: Record<string, string | number>) => api<Product[]>(`/product/products${qs(o)}`),
  topPicks: () => api<Product[]>("/product/top-picks"),
  // Backend search param is `query` (not `q`).
  search: (q: string, t?: string) => api<Product[]>(`/product/search${qs({ query: q })}`, { token: t, pick: "products" }),
  searchMine: (q: string, t: string) => api<Product[]>(`/product/search/my${qs({ query: q })}`, { token: t, pick: "products" }),
  filter: (o: Record<string, string | number | undefined>, t?: string) =>
    api<Product[]>(`/product/filter${qs(o)}`, { token: t, pick: "products" }),
  get: (id: string) => api<Product>(`/product/${id}`, { pick: "product" }),
  myProducts: (t: string) => api<Product[]>("/product/seller/my-products", { token: t, pick: "products" }),
  create: (b: unknown, t: string) => api("/product/create", { method: "POST", body: b, token: t }),
  createV2: (b: unknown, t: string) => api("/product/create-v2", { method: "POST", body: b, token: t }),
  uploadTokens: (t: string) => api("/product/upload-tokens", { method: "POST", token: t }),
  updateStatus: (id: string, b: unknown, t: string) =>
    api(`/product/${id}/status`, { method: "PUT", body: b, token: t }),
  like: (id: string, t: string) => api(`/product/${id}/like`, { method: "POST", token: t }),
  save: (id: string, t: string) => api(`/product/${id}/save`, { method: "POST", token: t }),
  view: (id: string) => api(`/product/${id}/view`, { method: "POST" }),
  share: (id: string) => api(`/product/${id}/share`, { method: "POST" }),
  comment: (id: string, b: unknown, t: string) =>
    api(`/product/${id}/comment`, { method: "POST", body: b, token: t }),
  review: (id: string, b: unknown, t: string) =>
    api(`/product/${id}/review`, { method: "POST", body: b, token: t }),
  setBargainSettings: (id: string, b: unknown, t: string) =>
    api(`/product/${id}/bargain-settings`, { method: "POST", body: b, token: t }),
  setGlobalBargain: (b: unknown, t: string) =>
    api("/product/global-bargain-settings", { method: "POST", body: b, token: t }),
  setTopPick: (id: string, b: unknown, t: string) =>
    api(`/product/${id}/set-top-pick`, { method: "POST", body: b, token: t }),
};

// ─── Categories & search (/category, /search) ───────────────────────────────
export const categories = {
  list: () => api<Category[]>("/category", { pick: "categories" }),
  subcategories: (id: string) => api(`/category/${id}/subcategories`, { pick: "subCategories" }),
};
export const search = {
  query: (q: string, t?: string) => api<Product[]>(`/search/search${qs({ query: q })}`, { token: t, pick: "products" }),
  popular: () => api<unknown[]>("/search/popular", { pick: "popularSearches" }),
};

// ─── Trending (/trending) ───────────────────────────────────────────────────
export const trending = {
  products: () => api<Product[]>("/trending/trending"),
  bits: () => api<Bit[]>("/trending/trending/bits"),
  live: () => api<LiveSession[]>("/trending/trending/live"),
};

// ─── Cart (/cart) ───────────────────────────────────────────────────────────
export const cart = {
  get: (t: string) => api("/cart", { token: t, pick: "cart" }),
  update: (b: unknown, t: string) => api("/cart/update", { method: "POST", body: b, token: t }),
  remove: (b: unknown, t: string) => api("/cart/remove", { method: "POST", body: b, token: t }),
  applyCoupon: (b: unknown, t: string) => api("/cart/coupon", { method: "POST", body: b, token: t }),
  removeCoupon: (t: string) => api("/cart/coupon", { method: "DELETE", token: t }),
  addBargain: (bargainId: string, t: string) =>
    api(`/cart/${bargainId}/add-bargain`, { method: "POST", token: t }),
};

// ─── Coupons (/coupons) ─────────────────────────────────────────────────────
export const coupons = {
  myCoupons: (t: string) => api("/coupons/my-coupons", { token: t }),
  apply: (b: unknown, t: string) => api("/coupons/apply", { method: "POST", body: b, token: t }),
  markUsed: (b: unknown, t: string) => api("/coupons/mark-used", { method: "POST", body: b, token: t }),
  trackView: (b: unknown) => api("/coupons/track-view", { method: "POST", body: b }),
  // seller-side
  list: (t: string) => api("/coupons/list", { token: t }),
  dashboard: (t: string) => api("/coupons/dashboard", { token: t }),
  get: (id: string, t: string) => api(`/coupons/${id}`, { token: t }),
  create: (b: unknown, t: string) => api("/coupons/create", { method: "POST", body: b, token: t }),
  update: (id: string, b: unknown, t: string) =>
    api(`/coupons/${id}`, { method: "PUT", body: b, token: t }),
  toggle: (id: string, t: string) => api(`/coupons/${id}/toggle`, { method: "POST", token: t }),
  remove: (id: string, t: string) => api(`/coupons/${id}`, { method: "DELETE", token: t }),
};

// ─── Checkout & payments (/checkout) ────────────────────────────────────────
export const checkout = {
  initiate: (b: unknown, t: string) => api("/checkout/initiate", { method: "POST", body: b, token: t }),
  razorpayInitiate: (b: unknown, t: string) =>
    api("/checkout/payment/razorpay/initiate", { method: "POST", body: b, token: t }),
  razorpayVerify: (b: unknown, t: string) =>
    api("/checkout/payment/razorpay/verify", { method: "POST", body: b, token: t }),
};

// ─── Orders (/orders) ───────────────────────────────────────────────────────
export const orders = {
  myOrders: (t: string) => api("/orders/my-orders", { token: t }),
  get: (id: string, t: string) => api(`/orders/${id}`, { token: t }),
  create: (b: unknown, t: string) => api("/orders/create", { method: "POST", body: b, token: t }),
  createDirect: (b: unknown, t: string) => api("/orders/create-direct", { method: "POST", body: b, token: t }),
  verifyPayment: (b: unknown, t: string) => api("/orders/verify-payment", { method: "POST", body: b, token: t }),
  cancel: (id: string, b: unknown, t: string) => api(`/orders/${id}/cancel`, { method: "POST", body: b, token: t }),
  review: (id: string, b: unknown, t: string) => api(`/orders/${id}/review`, { method: "POST", body: b, token: t }),
  generateInvoice: (id: string, t: string) => api(`/orders/${id}/generate-invoice`, { method: "POST", token: t }),
  invoiceUrl: (fileName: string) => `${BASE}/api/v1/orders/invoice/download/${fileName}`,
  // seller-side
  sellerOrders: (t: string) => api("/orders/seller/orders", { token: t, pick: "orders" }),
  sellerDashboard: (t: string) => api("/orders/seller/dashboard", { token: t, raw: true }),
  groupedBySeller: (t: string) => api("/orders/grouped-by-seller", { token: t }),
  updateStatus: (id: string, b: unknown, t: string) =>
    api(`/orders/seller/orders/${id}/update-status`, { method: "POST", body: b, token: t }),
  sellerCancel: (id: string, b: unknown, t: string) =>
    api(`/orders/${id}/seller-cancel`, { method: "POST", body: b, token: t }),
};

// ─── Bargains (/bargains) — the core negotiation flow ───────────────────────
export const bargains = {
  create: (b: unknown, t: string) => api("/bargains/create", { method: "POST", body: b, token: t }),
  get: (id: string, t: string) => api(`/bargains/${id}`, { token: t }),
  myBargains: (t: string) => api("/bargains/buyer/my-bargains", { token: t }),
  buyerCounter: (id: string, b: unknown, t: string) =>
    api(`/bargains/${id}/buyer-counter`, { method: "POST", body: b, token: t }),
  acceptCounter: (id: string, t: string) => api(`/bargains/${id}/accept-counter`, { method: "POST", token: t }),
  rejectCounter: (id: string, t: string) => api(`/bargains/${id}/reject-counter`, { method: "POST", token: t }),
  // seller-side
  sellerBargains: (t: string) => api("/bargains/seller/my-bargains", { token: t, pick: "bargains" }),
  sellerDashboard: (t: string) => api("/bargains/seller/dashboard", { token: t, raw: true }),
  accept: (id: string, t: string) => api(`/bargains/${id}/accept`, { method: "POST", token: t }),
  reject: (id: string, t: string) => api(`/bargains/${id}/reject`, { method: "POST", token: t }),
  counter: (id: string, b: unknown, t: string) =>
    api(`/bargains/${id}/counter`, { method: "POST", body: b, token: t }),
};

// ─── Addresses (/address) & IFSC (/ifsc) ────────────────────────────────────
export const address = {
  list: (t: string) => api("/address", { token: t }),
  save: (b: unknown, t: string) => api("/address/save", { method: "POST", body: b, token: t }),
  update: (id: string, b: unknown, t: string) => api(`/address/${id}`, { method: "PUT", body: b, token: t }),
  remove: (id: string, t: string) => api(`/address/${id}`, { method: "DELETE", token: t }),
  geocode: (b: unknown) => api("/address/geocode", { method: "POST", body: b }),
};
export const ifsc = { lookup: (code: string) => api(`/ifsc${qs({ ifsc: code })}`) };

// ─── Live (/live) ───────────────────────────────────────────────────────────
export const live = {
  sessions: () => api<LiveSession[]>("/live/sessions"),
  details: (sessionId: string) => api(`/live/session/${sessionId}/details`),
  comments: (sessionId: string) => api(`/live/session/${sessionId}/comments`),
  token: (b: unknown, t: string) => api("/live/token", { method: "POST", body: b, token: t, raw: true }),
  refreshToken: (b: unknown, t: string) => api("/live/refresh-token", { method: "POST", body: b, token: t, raw: true }),
  join: (sessionId: string, t: string) =>
    api<{ appId?: string; token?: string; uid?: number; channelName?: string }>(
      `/live/session/${sessionId}/join`, { method: "POST", token: t, raw: true }),
  leave: (sessionId: string, t: string) => api(`/live/session/${sessionId}/leave`, { method: "POST", token: t }),
  comment: (sessionId: string, b: unknown, t: string) =>
    api(`/live/session/${sessionId}/comment`, { method: "POST", body: b, token: t }),
  like: (sessionId: string, t: string) => api(`/live/session/${sessionId}/like`, { method: "POST", token: t }),
  heartbeat: (sessionId: string, t: string) => api(`/live/session/${sessionId}/heartbeat`, { method: "POST", token: t }),
  share: (sessionId: string) => api(`/live/session/${sessionId}/share`),
  // seller-side
  dashboard: (t: string) => api("/live/dashboard", { token: t, raw: true }),
  schedule: (b: unknown, t: string) => api("/live/schedule", { method: "POST", body: b, token: t }),
  end: (sessionId: string, t: string) => api(`/live/session/${sessionId}/end`, { method: "PATCH", token: t }),
};

// ─── Bits — short shopping videos (/bits) ───────────────────────────────────
export const bits = {
  list: () => api<Bit[]>("/bits/list"),
  get: (id: string) => api<Bit>(`/bits/${id}`),
  dashboard: (t: string) => api("/bits/dashboard", { token: t }),
  uploadToken: (t: string) => api("/bits/upload-token", { token: t }),
  upload: (b: unknown, t: string) => api("/bits/upload", { method: "POST", body: b, token: t }),
  toggleLike: (id: string, t: string) => api(`/bits/${id}/toggleLike`, { method: "POST", token: t }),
  save: (id: string, t: string) => api(`/bits/${id}/save`, { method: "POST", token: t }),
  comment: (id: string, b: unknown, t: string) => api(`/bits/${id}/comments`, { method: "POST", body: b, token: t }),
  share: (id: string) => api(`/bits/${id}/share`, { method: "POST" }),
  view: (id: string) => api(`/bits/${id}/view`, { method: "POST" }),
};

// ─── Notifications & preferences ────────────────────────────────────────────
export const notifications = {
  list: (t: string) => api("/notifications", { token: t }),
  markRead: (id: string, t: string) => api(`/notifications/${id}/read`, { method: "PUT", token: t }),
  markAllRead: (t: string) => api("/notifications/read-all", { method: "PUT", token: t }),
  remove: (id: string, t: string) => api(`/notifications/${id}`, { method: "DELETE", token: t }),
};
export const preferences = {
  get: (t: string) => api("/preference", { token: t }),
  categories: () => api("/preference/categories"),
  save: (b: unknown, t: string) => api("/preference/save", { method: "POST", body: b, token: t }),
  update: (b: unknown, t: string) => api("/preference/update", { method: "PUT", body: b, token: t }),
};

// ─── Seller payments (/payments) ────────────────────────────────────────────
export const payments = {
  summary: (t: string) => api("/payments/summary", { token: t }),
  due: (t: string) => api("/payments/due", { token: t }),
  done: (t: string) => api("/payments/done", { token: t }),
  adjustments: (t: string) => api("/payments/adjustments", { token: t }),
  payout: (payoutId: string, t: string) => api(`/payments/payout/${payoutId}`, { token: t }),
};

// ─── Support & legal ────────────────────────────────────────────────────────
export const content = {
  // backend exposes support as GET (query params), not POST
  support: (o?: Record<string, string>) => api(`/contact/support${qs(o)}`),
  terms: () => api("/terms-and-conditions"),
  privacy: () => api("/privacy-policy"),
};

// Namespace used by the server pages. All reads accept an optional JWT so a
// logged-in session pulls live data; without one they use ZATCH_API_TOKEN (if
// set) and otherwise fail → pages fall back to placeholder content.
export const catalog = {
  topPicks: (t?: string) => api<Product[]>("/product/top-picks", { token: t, pick: "products" }),
  products: (q = "", t?: string) => api<Product[]>(`/product/products${q}`, { token: t, pick: "products" }),
  product: (id: string, t?: string) => api<Product>(`/product/${id}`, { token: t, pick: "product" }),
  categories: () => categories.list(),
  trending: (t?: string) => api<Product[]>("/trending/trending", { token: t, pick: "products" }),
  liveSessions: (t?: string) => api<LiveSession[]>("/live/sessions", { token: t, pick: "sessions" }),
  bits: (t?: string) => api<Bit[]>("/bits/list", { token: t, pick: "bits" }),
};
