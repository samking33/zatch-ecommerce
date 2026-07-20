# Zatch Ecommerce Web

Award-grade storefront for the Zatch live-bargain marketplace. Next.js 15 (App
Router) + TypeScript + Tailwind v4, consuming the existing `zatch-main` Express
API. Design language: light "editorial commerce" bento — glassy cards, tight
grotesque display type, Zatch lime (`#CAFE38`) accent.

## Run

```bash
npm install
cp .env.example .env        # point NEXT_PUBLIC_API_URL at your zatch-main backend
npm run dev                 # http://localhost:3000
```

The storefront ships with tasteful sample data (`src/lib/placeholder.ts`), so it
renders fully even before the backend is running. When the API is reachable,
real data replaces the samples automatically.

## What's here

- **Home** (`/`) — bento hero with the live **bargain ticker** (the signature),
  live-preview card, categories, stats, Bits.
- **Shop / Category / Search** — product grids with the "Bargain" badge.
- **Product** (`/product/[id]`) — gallery, variants, and the interactive
  **Make an offer** widget mirroring the backend bargain flow.
- **Live** (`/live`, `/live/[channel]`) — sessions grid + a live room with chat
  and in-stream bargaining.
- **Bits, Sell, Cart, Checkout, Login** — built out.
- Account / orders / bargains / legal — navigable placeholders wired to their
  endpoints, ready to build next.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full page → endpoint map and
[TECH_STACK.md](./TECH_STACK.md) for stack rationale.

## Notes

- Product visuals are self-contained CSS/gradient renders (`ProductOrb`) so the
  app looks intentional offline; swap in real product images for production.
- Realtime (Socket.io bargain updates, Agora live video) is stubbed in the UI —
  wire to the backend sockets/tokens to go fully live.
