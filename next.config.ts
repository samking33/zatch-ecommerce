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
  images: {
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
    return [{ source: "/api/v1/:path*", destination: `${API}/api/v1/:path*` }];
  },
};

export default nextConfig;
