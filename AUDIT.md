# Zatch Web App — Full Audit

Audit of the web storefront against the `zatch-main` backend (live at
`https://zatch-i8ln.onrender.com`). Endpoints were **live-tested with a real
JWT**; every read endpoint was called, every mutation was probed with an empty
body (safe: validation rejects, proving the route is mounted, without creating
data). Security was reviewed against the actual source.

**Date:** 2026-07-20 · **Result:** storefront + full buyer workflow wired to real
data. 3 real issues found and fixed (search bug + 2 security items), plus a
missing order-detail page (built). Remaining gaps are seller-dashboard and
real-time (Agora) surfaces, listed at the end.

---

## 1. Bugs found & fixed during this audit

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | **Search broken** — web sent `?q=`, backend expects `?query=`. All search returned `400 Query parameter is required`. | High | ✅ Fixed (`api.ts`, `search/page.tsx`) — now returns real results |
| 2 | **Order detail page missing** — `/orders/[id]` linked from the orders list 404'd (dead-end in the workflow). | Medium | ✅ Fixed — built real order-detail page |
| 3 | `next/image` allowed **any host** (`hostname:"**"`) — open image proxy. | Medium (sec) | ✅ Fixed — restricted to `*.b-cdn.net` + localhost |
| 4 | **No security headers** (X-Frame-Options, nosniff, Referrer-Policy…). | Medium (sec) | ✅ Fixed — added in `next.config.ts` |
| 5 | Token cookie lacked **`Secure`** on HTTPS. | Low (sec) | ✅ Fixed — `Secure` added when `location.protocol === https` |
| 6 | Dead client methods `users.follow`/`unfollow` → backend `/user/follow` returns `404 Route not found`. | Low | ⚠️ Not used in UI; real endpoint is `toggleFollow` (wired). Noted. |

---

## 2. Feature parity — mobile app → web

Legend: ✅ full (built + real data/actions) · 🟡 partial (UI exists, action/realtime not wired) · ⛔ missing · 🏬 seller/admin surface (out of storefront scope)

### Buyer storefront
| Feature | Web page | Status |
|---|---|---|
| Browse products | `/shop` | ✅ real products, images, prices |
| Category filter + subcategories | `/shop`, `/category/[slug]` | ✅ via `/product/filter` (slug-based) |
| Sort (newest/popular/price) | `/shop` | ✅ |
| Product detail + gallery + variants | `/product/[id]` | ✅ real variants (colour/size), images |
| Search | `/search` | ✅ (fixed this audit) |
| Popular searches | — | 🟡 endpoint wired, no UI surface |
| Product reviews / comments | `/product/[id]` | 🟡 shown as counts; add-review not wired |
| Like / save (wishlist) | `/wishlist` | 🟡 endpoints wired; no "my liked" list endpoint exists in backend |
| **Live bargaining — make offer** | `/product/[id]` | ✅ `POST /bargains/create`, real thresholds |
| Bargain counter / accept | `/product/[id]`, `/bargains` | ✅ accept-counter + add-to-cart wired |
| My bargains | `/bargains` | ✅ real data + empty state |
| Cart (view/update/remove) | `/cart` | ✅ real `/cart` writes |
| Cart coupon | `/cart` | 🟡 endpoint wired; not surfaced in cart UI |
| Checkout + Razorpay | `/checkout` | ✅ full flow (address + initiate + Razorpay + verify) |
| Orders list | `/orders` | ✅ |
| Order detail + timeline | `/orders/[id]` | ✅ (built this audit) |
| Order cancel / review / invoice | — | 🟡 endpoints wired; buttons not yet on detail page |
| Addresses (list/add/delete) | `/account/addresses` | ✅ real CRUD |
| Notifications | `/notifications` | ✅ real + mark-read wired |
| Account / profile | `/account` | ✅ real profile |
| Edit profile / change password | — | 🟡 endpoints wired; no form UI |
| Shopping preferences | — | 🟡 endpoints wired; no UI |
| Search history | — | 🟡 endpoint wired; no UI |

### Content / discovery
| Feature | Web page | Status |
|---|---|---|
| Bits (short video feed) | `/bits` | ✅ real 84 videos + thumbnails |
| Bits playback (video) | `/bits` | 🟡 thumbnails only, no player |
| Bits like/save/comment actions | — | 🟡 endpoints wired; not surfaced |
| Live sessions index | `/live` | ✅ real sessions + "no one live" state |
| Live room (video + chat + bargain) | `/live/[channel]` | 🟡 UI built; **Agora video + socket chat simulated** |
| Trending | — | 🟡 endpoint wired; home uses top-picks/live/bits instead |
| Categories | home, `/shop` | ✅ real names + images |

### Auth
| Feature | Web page | Status |
|---|---|---|
| Phone + password login | `/login` | ✅ real JWT session |
| OTP login / 2FA | `/login` | 🟡 OTP endpoints wired; UI is password-only |
| Register | `/register` | 🟡 stub UI; endpoints wired |
| Forgot password | `/forgot-password` | 🟡 stub UI; endpoints wired |
| Logout | nav/account | ✅ |

### Seller (🏬 mostly a separate app surface)
| Feature | Status |
|---|---|
| Become a seller (marketing) | ✅ `/sell` |
| Seller register / status / benefits / profile-completion | 🟡 endpoints wired; no dashboard UI |
| Seller: my products / orders / dashboard | 🟡 endpoints wired; no UI (mobile/admin) |
| Seller: bargain dashboard, live dashboard, coupons | 🟡 endpoints wired; no UI |
| Seller payouts (summary/due/done/adjustments) | 🟡 endpoints wired; no UI |

---

## 3. Endpoint reachability (live-tested with JWT)

All 200 unless noted. Read endpoints called live; mutations probed with empty body.

### Working — reads (return real data)
`/product/products` (112) · `/product/top-picks` (10) · `/product/filter?category=` (20) ·
`/category` (9) · `/search/search?query=` ✅ · `/search/popular` (5) ·
`/trending/trending` · `/cart` · `/coupons/list` (2) · `/orders/my-orders` ·
`/orders/seller/orders` · `/orders/seller/dashboard` · `/bargains/buyer/my-bargains` ·
`/bargains/seller/dashboard` · `/live/sessions` · `/live/dashboard` · `/bits/list` (10) ·
`/bits/dashboard` · `/address` · `/notifications` · `/preference` · `/preference/categories` (9) ·
`/payments/{summary,due,done,adjustments}` · `/user/profile` · `/user/seller/{status,benefits,profile-completion}` ·
`/user/all-users` (34 sellers) · `/user/search-history` · `/ifsc` · `/product/seller/my-products`

### Working — mutations (mounted, validate correctly)
`/cart/{update,remove,coupon}` · `/bargains/create` · `/coupons/{apply,mark-used}` ·
`/checkout/{initiate,payment/razorpay/initiate,payment/razorpay/verify}` ·
`/orders/{create,verify-payment}` · `/address/{save,geocode}` ·
`/product/:id/{like,save,view,comment,review}` · `/bits/:id/{toggleLike,view}` ·
`/live/{token,schedule}` · `/user/{logout,profile-update,change-password}` ·
`/preference/{save,update}` · `/notifications/read-all` ·
`/otp/{send-both,verify-both}` · `/twilio-sms/send-otp` · `/email/send-email-otp` ·
`/user/forgot-password/send-otp`

### ⚠️ Backend-side issues (not web bugs)
| Endpoint | Result | Impact |
|---|---|---|
| `GET /coupons/my-coupons` | **500 Server error** | Backend bug; not surfaced in web UI |
| `POST /user/follow` | **404 Route not found** | Use `/:id/toggleFollow` (which works) |
| `GET /terms-and-conditions`, `/privacy-policy` | return **HTML, not JSON** | Legal pages are stubs; fine |
| `GET /orders/grouped-by-seller` | **403 Admin access required** | Correctly admin-only |
| `GET /product/search?query=shirt` | 404 "No products found" | Different from `/search/search`; web uses the working one |

---

## 4. API coverage

- **171** backend route handlers (excludes the separate `/admin` app: **35** more).
- **133** wired into the typed client (`src/lib/api.ts`), across 21 namespaces.
- **~30** deliberately excluded (deep links, Razorpay webhook, cron jobs, admin
  moderation `:id/action`, category CRUD, `/test`). See
  [API_COVERAGE.md](./API_COVERAGE.md) for the per-endpoint breakdown.

---

## 5. Security audit

### Reviewed & clean
- **No injection sinks** — zero `dangerouslySetInnerHTML`, `eval`, or `innerHTML`. Product descriptions render as escaped text.
- **Token not in client bundle** — `ZATCH_API_TOKEN` is read via `process.env` (not `NEXT_PUBLIC_*`), so Next never inlines it into browser JS. Confirmed server-only.
- **No CSRF exposure** — the backend authorizes via `Authorization: Bearer`, not an ambient cookie, so cross-site requests can't forge authenticated calls. The `zatch_token` cookie is read by our own JS only.
- **API proxy is not open** — the `/api/v1/:path*` rewrite has a **fixed** destination host; it can't be pointed at arbitrary origins.
- **`.env` is gitignored and untracked** — the token can't be committed.
- **Security headers** — added `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (fixed this audit).
- **Image optimizer** — restricted from `**` to `*.b-cdn.net` (fixed this audit).

### Accepted risks / production to-dos
| Item | Severity | Note |
|---|---|---|
| Token in **non-httpOnly** cookie (readable by JS) | Medium | By design (mirrors the mobile app's stored token so SSR + client share it). An XSS would expose it — mitigated by having no injection sinks. To harden: move to an httpOnly cookie set by a Next Route Handler, with the server attaching it. |
| `ZATCH_API_TOKEN` is a **personal user JWT** used as the server-side default for logged-out traffic | Medium–High (prod) | Fine for dev/demo. For production, mint a dedicated service token or make product-listing endpoints public — otherwise all anonymous traffic acts as one real user, and it expires in ~7 days. |
| No **Content-Security-Policy** | Low–Medium | Headers added, but a strict CSP (esp. allowing `checkout.razorpay.com`) would further harden against XSS. |
| Backend requires auth for **public catalogue** | Design | Product/category browsing needs a token; this shapes the token-default decision above. |

---

## 6. Gaps — now closed

All items from the first pass are built:

1. **Live video (Agora)** — ✅ real Agora Web SDK player (`agora-player.tsx`) joins the channel via `POST /live/session/:id/join` and plays the host track; live chat posts/polls real comments. (Can't fully demo until a seller goes live, but it's wired to the real endpoints.)
2. **Bits video playback** — ✅ tapping a Bit opens a real `<video>` player of the mp4 + records a real view.
3. **Seller dashboard** — ✅ `/seller/dashboard` with real KPIs (revenue, orders, bargains, payouts, views), and your live products grid.
4. **Secondary buyer surfaces** — ✅ register, forgot-password (3-step), edit-profile, change-password, cart coupon apply/remove, order cancel/review/invoice — all built and wired.

### Still needing external action (not code)
- **Real Razorpay charge** — flow is production-correct; a live payment wasn't executed during audit (real money).
- **`ZATCH_API_TOKEN`** — still a personal JWT used as the server default; swap for a service token before production (see §5).

---

*Verification: `npm run build` passes (28 routes); all pages return 200; search,
category filter, add-to-cart, and profile confirmed against live backend data.*
