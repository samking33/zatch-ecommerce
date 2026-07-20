import type { Product, Category, LiveSession, Bit } from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

type FetchOpts = RequestInit & { revalidate?: number };

/**
 * Thin wrapper over the zatch-main REST API. Server components call it with
 * an absolute URL; client code can use the same paths via the Next rewrite.
 * Never throws on a bad response — returns null so pages degrade gracefully
 * instead of 500-ing when the backend is down. ponytail: no retry/backoff
 * layer until a flaky endpoint proves it needs one.
 */
export async function api<T>(path: string, opts: FetchOpts = {}): Promise<T | null> {
  const { revalidate = 60, ...init } = opts;
  try {
    const res = await fetch(`${BASE}/api/v1${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Backend wraps most payloads as { success, data } or { data } — unwrap.
    return (json?.data ?? json) as T;
  } catch {
    return null;
  }
}

export const catalog = {
  topPicks: () => api<Product[]>("/product/top-picks"),
  products: (q = "") => api<Product[]>(`/product/products${q}`),
  product: (id: string) => api<Product>(`/product/${id}`),
  categories: () => api<Category[]>("/category"),
  trending: () => api<Product[]>("/trending/trending"),
  liveSessions: () => api<LiveSession[]>("/live/sessions"),
  bits: () => api<Bit[]>("/bits/list"),
};
