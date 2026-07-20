# Zatch Ecommerce Web — Architecture

Web storefront for the Zatch live-bargain marketplace. Consumes the existing Express + MongoDB API in `zatch-main` (base URL `/api/v1`). No backend changes.

## What Zatch actually is (from the backend)

Not a plain store. Three pillars, all already built server-side:

1. **Live bargaining** — buyer sends an offer, seller counters in real time, auto-accept thresholds (`/bargains`, `bargainModel`). This is the signature.
2. **Live shopping** — Agora live sessions with real-time viewers, comments, likes (`/live`, `liveModel`).
3. **Bits** — short shopping videos, TikTok-style, that convert to orders (`/bits`, `buy_bits`).

Plus the standard commerce spine: products with variants, cart, coupons, checkout (Razorpay), orders, addresses, notifications, buyer/seller accounts.

## Page map

Each page lists the primary endpoints it calls. Auth is JWT (from `/user/login` + OTP verify), stored httpOnly cookie, checked in middleware.

### Public / storefront

| Route | Page | Key endpoints |
|---|---|---|
| `/` | **Home** — bento hero, live-now strip, top picks, trending, Bits, categories | `GET /product/top-picks`, `GET /trending`, `GET /trending/live`, `GET /trending/bits`, `GET /category`, `GET /live/sessions` |
| `/shop` | **Shop / listing** — filter, sort, search, infinite scroll | `GET /product/products`, `GET /product/filter`, `GET /product/search`, `GET /category` |
| `/category/[slug]` | **Category** | `GET /category/:id/subcategories`, `GET /product/filter` |
| `/product/[id]` | **Product detail** — variants, reviews, **"Make an offer"** bargain CTA, add-to-cart, seller card | `GET /product/:id`, `POST /product/:id/view`, `POST /bargains/create`, `POST /cart/update`, `POST /product/:id/like` |
| `/search` | **Search results** | `GET /search/search`, `GET /search/popular` |
| `/live` | **Live index** — sessions grid, "going live" schedule | `GET /live/sessions`, `GET /trending/live` |
| `/live/[channelName]` | **Live room** — Agora player, live chat, live bargain, buy | `POST /live/token`, `GET /live/session/:id/details`, `POST /live/session/:id/comment`, `POST /live/session/:id/like`, `POST /live/session/:id/heartbeat` |
| `/bits` | **Bits feed** — vertical short-video shopping | `GET /bits/list`, `POST /bits/:id/view`, `POST /bits/:id/toggleLike`, `POST /bits/:id/save` |
| `/seller/[userId]` | **Seller storefront / profile** | `GET /user/profile/:userId`, `GET /product/seller/my-products`, `POST /user/:targetUserId/toggleFollow` |

### Buyer account (auth required)

| Route | Page | Key endpoints |
|---|---|---|
| `/cart` | **Cart** — items, coupon, bargain-won items | `GET /cart`, `POST /cart/update`, `POST /cart/remove`, `POST /cart/coupon` |
| `/checkout` | **Checkout** — address, delivery, payment | `POST /checkout/initiate`, `POST /checkout/payment/razorpay/initiate`, `POST /checkout/payment/razorpay/verify`, `GET /address` |
| `/orders` | **My orders** | `GET /orders/my-orders`, `GET /orders/:id` |
| `/orders/[id]` | **Order detail** — status, invoice, review, cancel | `GET /orders/:id`, `POST /orders/:id/cancel`, `POST /orders/:id/review`, `GET /orders/invoice/download/:file` |
| `/bargains` | **My bargains** — active offers/counters (real-time) | `GET /bargains/buyer/my-bargains`, `POST /bargains/:id/accept-counter`, `POST /bargains/:id/buyer-counter` |
| `/wishlist` | **Saved / liked** | product like/save endpoints |
| `/account` | **Profile & settings** | `GET /user/profile`, `PUT /user/profile-update`, `PUT /user/change-password` |
| `/account/addresses` | **Addresses** | `GET /address`, `POST /address/save`, `PUT /address/:id`, `DELETE /address/:id` |
| `/notifications` | **Notifications** | `GET /notifications`, `PUT /notifications/:id/read` |

### Auth

| Route | Page | Key endpoints |
|---|---|---|
| `/login` | **Login** (phone/email + OTP or password) | `POST /user/login`, `POST /otp/send-both`, `POST /otp/verify-both` |
| `/register` | **Register** | `POST /user/register`, `POST /otp/verify-both` |
| `/forgot-password` | **Reset flow** | `POST /user/forgot-password/send-otp`, `.../verify-otp`, `.../reset` |
| `/sell` | **Become a seller** | `POST /user/seller/register`, `GET /user/seller/status`, `GET /user/seller/benefits` |

### Static / legal

`/about`, `/terms` (`GET /terms-and-conditions`), `/privacy` (`GET /privacy-policy`), `/support` (`POST /contact`), `/returns`, `/shipping`.

### Realtime (Socket.io + Agora)

- **Bargain updates** — subscribe to bargain events so counters/accepts update live on `/product/[id]`, `/bargains`, `/live/[channelName]`.
- **Live sessions** — Agora Web SDK player + Socket.io for comments/viewer count on `/live/[channelName]`.

## Rendering strategy

- **SSR/ISR**: `/`, `/shop`, `/product/[id]`, `/category/[slug]`, `/seller/[id]` — SEO + fast first paint, revalidate on interval.
- **Client-rendered**: cart, checkout, account, bargains, live room, bits — auth'd + realtime, no SEO need.
- Data fetched in Server Components where possible; TanStack Query for client mutations/realtime; Zustand mirrors server cart.

ponytail: page list is scoped to endpoints that exist today. Admin panel is a separate app (backend `/admin`) — not in this storefront.
