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
    const json = await res.json().catch(() => null);
    // 409 carries useful context (e.g. an existing bargain) — hand it back so
    // callers can show it instead of a generic failure.
    if (!res.ok) return res.status === 409 ? (json as T) : null;
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
  publicProfile: (userId: string, t?: string) => api(`/user/profile/${userId}`, { token: t, pick: "user" }),
  shareProfile: (userId: string) => api(`/user/share-profile/${userId}`),
  all: (t?: string) => api("/user/all-users", { token: t, pick: "sellers" }),
  // Entries are { query, createdAt, _id } objects, not plain strings.
  searchHistory: (t: string) =>
    api<{ query: string; createdAt?: string; _id?: string }[]>("/user/search-history", {
      token: t, pick: "searchHistory",
    }),
  follow: (b: unknown, t: string) => api("/user/follow", { method: "POST", body: b, token: t }),
  unfollow: (b: unknown, t: string) => api("/user/unfollow", { method: "POST", body: b, token: t }),
  toggleFollow: (targetUserId: string, t: string) =>
    api(`/user/${targetUserId}/toggleFollow`, { method: "POST", token: t }),
  review: (b: unknown, t: string) => api("/user/review", { method: "POST", body: b, token: t }),
};

// ─── Seller onboarding & status (/user/seller) ──────────────────────────────
export type SellerBenefits = {
  header?: { title?: string; images?: string[] };
  features?: { icon?: string; iconBg?: string; title?: string; description?: string }[];
};

export type SellerStatusDisplay = {
  title?: string;
  subtitle?: string;
  description?: string;
  mainText?: string;
  status?: string;
  action?: { label?: string; route?: string };
};

export const seller = {
  register: (b: unknown, t: string) =>
    api("/user/seller/register", { method: "POST", body: b, token: t }),
  approve: (b: unknown, t: string) =>
    api("/user/seller/approve", { method: "POST", body: b, token: t }),
  status: (t: string) =>
    api<{ sellerStatus?: string; statusDisplay?: SellerStatusDisplay }>("/user/seller/status", { token: t, raw: true }),
  terms: () => api("/user/seller/terms-and-conditions"),
  profileCompletion: (t: string) => api("/user/seller/profile-completion", { token: t, raw: true }),
  benefits: (t: string) => api<SellerBenefits>("/user/seller/benefits", { token: t, pick: "data" }),
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
  dashboard: (t: string) => api("/coupons/dashboard", { token: t, raw: true }),
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
  generateInvoice: (id: string, t: string) => api(`/orders/${id}/generate-invoice`, { method: "POST", token: t, raw: true }),
  invoiceUrl: (fileName: string) => `${BASE}/api/v1/orders/invoice/download/${fileName}`,
  // seller-side
  sellerOrders: (t: string, o?: Record<string, string | undefined>) =>
    api(`/orders/seller/orders${qs(o)}`, { token: t, pick: "orders" }),
  sellerOrdersRaw: (t: string, o?: Record<string, string | undefined>) =>
    api(`/orders/seller/orders${qs(o)}`, { token: t, raw: true }),
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
  get: (id: string, t: string) => api(`/bargains/${id}`, { token: t, pick: "bargain" }),
  // status accepts the backend's tab pseudo-values: "active" | "history".
  myBargains: (t: string, status?: string) =>
    api(`/bargains/buyer/my-bargains${qs({ status })}`, { token: t }),
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
  geocode: (lat: number, lng: number, t?: string) =>
    api<{ formatted?: string; line1?: string; city?: string; state?: string; pincode?: string }>(
      "/address/geocode", { method: "POST", body: { lat, lng }, token: t, pick: "address" }),
};
export const ifsc = { lookup: (code: string) => api(`/ifsc${qs({ ifsc: code })}`) };

// ─── Live (/live) ───────────────────────────────────────────────────────────
export const live = {
  sessions: () => api<LiveSession[]>("/live/sessions"),
  details: (sessionId: string, t?: string) =>
    api<{ session?: LiveSession } & LiveSession>(`/live/session/${sessionId}/details`, { token: t, raw: true }),
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
  share: (sessionId: string) => api(`/live/session/${sessionId}/share`, { raw: true }),
  // seller-side
  dashboard: (t: string) => api("/live/dashboard", { token: t, raw: true }),
  schedule: (b: unknown, t: string) => api("/live/schedule", { method: "POST", body: b, token: t }),
  end: (sessionId: string, t: string) => api(`/live/session/${sessionId}/end`, { method: "PATCH", token: t }),
  // Seller-side: edit | cancel | reschedule
  action: (
    sessionId: string,
    b: { action: string; title?: string; description?: string; scheduledStartTime?: string },
    t: string,
  ) => api(`/live/session/${sessionId}/action`, { method: "PATCH", body: b, token: t, raw: true }),
};

// ─── Bits — short shopping videos (/bits) ───────────────────────────────────
export const bits = {
  list: (t?: string) => api<Bit[]>("/bits/list", { token: t, pick: "bits" }),
  get: (id: string, t?: string) => api<Bit>(`/bits/${id}`, { token: t, pick: "bit" }),
  dashboard: (t: string) => api("/bits/dashboard", { token: t, raw: true }),
  uploadToken: (t: string) => api("/bits/upload-token", { token: t, raw: true }),
  upload: (b: unknown, t: string) => api("/bits/upload", { method: "POST", body: b, token: t }),
  toggleLike: (id: string, t: string) => api(`/bits/${id}/toggleLike`, { method: "POST", token: t, raw: true }),
  save: (id: string, t: string) => api(`/bits/${id}/save`, { method: "POST", token: t, raw: true }),
  comment: (id: string, b: unknown, t: string) => api(`/bits/${id}/comments`, { method: "POST", body: b, token: t, raw: true }),
  share: (id: string, t?: string) => api(`/bits/${id}/share`, { method: "POST", token: t, raw: true }),
  view: (id: string, t?: string) => api(`/bits/${id}/view`, { method: "POST", token: t }),
  // Seller-side: Edit | Delete | Deactivate | Activate
  action: (id: string, b: { action: string; title?: string; description?: string }, t: string) =>
    api(`/bits/${id}/action`, { method: "PATCH", body: b, token: t, raw: true }),
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
  payout: (payoutId: string, t: string) => api(`/payments/payout/${payoutId}`, { token: t, raw: true }),
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
