# Zatch Ecommerce Web App — Tech Stack

Backend is `zatch-main` (Express + MongoDB/Mongoose REST API, Socket.io, Agora, Razorpay, JWT auth) — reused as-is, no rewrite. This document covers the web frontend only.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | SSR/ISR for product & category pages = real SEO, unlike a client-only SPA |
| Data fetching | Server Components + fetch to existing Express API | No new backend, no GraphQL layer needed |
| Client cache/mutations | TanStack Query | Cart, bargain state, order status — optimistic UI |
| Realtime (bargain, live cart) | `socket.io-client` | Backend already runs Socket.io — reuse the same server |
| Live video | Agora Web SDK (`agora-rtc-sdk-ng`) | Backend already issues Agora tokens for mobile; same tokens work for web |
| Payments | Razorpay Checkout.js (web) | Backend already has Razorpay order/verify endpoints |
| Auth | JWT from existing `/user` routes, stored httpOnly cookie, verified in Next.js middleware | Reuses backend auth, no parallel auth system |
| Styling | Tailwind + shadcn/ui | Matches `zatch/BRAND_GUIDELINES.md` tokens directly |
| State (cart/UI) | Zustand | Mirrors server-side cart client-side, no Redux boilerplate |

## Explicitly skipped

- GraphQL gateway / BFF layer — Express API already serves this purpose.
- Separate auth service — reuse existing JWT auth.
- Redux — Zustand covers the actual state surface.

ponytail: this is the initial stack pick, not a scaffolded app. Revisit once real requirements (SSR data volume, live-stream concurrency) surface.
