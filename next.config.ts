import type { NextConfig } from "next";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Uploads reach the backend through the rewrite below, and Next cuts proxied
    // bodies off at 10 MB by default, which breaks multi-photo products and Bit
    // videos (the backend allows 50 MB). Photos are also shrunk in the browser.
    // ponytail: the proxy holds up to this much per upload in memory; move uploads
    // to direct-to-CDN tokens (/product/upload-tokens) if that ever bites.
    middlewareClientMaxBodySize: "60mb",
  },
  images: {
    // Seller uploads are raw phone photos (up to ~21MB), and resizing them with
    // sharp on a 0.5-CPU instance starves the event loop until outbound fetches
    // time out. Cache each optimized result for a year so a given image is only
    // ever resized once per container, instead of on every cold request.
    minimumCacheTTL: 31536000,
    // One format, not avif+webp: avif costs several times more CPU per image.
    formats: ["image/webp"],
    // Cards top out around 224px CSS width, so the huge variants are never used
    // and only add sharp jobs. Trimmed to what the layouts actually request.
    imageSizes: [64, 128, 256, 384],
    deviceSizes: [640, 828, 1080, 1920],
    // Restrict the image optimizer to the app's own CDN + backend, not any host.
    remotePatterns: [
      { protocol: "https", hostname: "zatchp.b-cdn.net" },
      { protocol: "https", hostname: "zatchP.b-cdn.net" },
      { protocol: "https", hostname: "*.b-cdn.net" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Proxy API calls to the Express backend so the browser talks same-origin
  // and the JWT flows without CORS gymnastics. Destination host is fixed.
  async rewrites() {
    // Proxy both API versions so browser calls stay same-origin (no CORS).
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};

export default nextConfig;
