import { api } from "@/lib/api";
import imageLoader from "@/lib/image-loader";

/**
 * Product catalogue feed for Meta catalogue ads and Google Merchant Center.
 * Both read the Google Merchant RSS format, so one feed serves both.
 *
 * Each item's id is the product's Mongo id - the same value the pixel, GA4 and
 * the Conversions API send as content_ids / item_id. If those ever differ, the
 * platforms cannot tie a view or a sale back to a catalogue product and dynamic
 * ads stop working.
 */

// Product pages live here, not on the zatch.shop marketing site.
const SITE = "https://live.zatch.shop";
const PAGE_SIZE = 100;
// ponytail: guards against a backend paging bug looping forever (~5,000 products).
// Raise it if the active catalogue ever gets close.
const MAX_PAGES = 50;
// An hour is far fresher than either platform fetches, and keeps the backend to
// a handful of requests per hour however often the feed is crawled.
const CACHE_SECONDS = 3600;

// Built per request, never at build time: a backend blip during a deploy must
// not fail the build.
export const dynamic = "force-dynamic";

type FeedProduct = {
  _id: string;
  name?: string;
  description?: string;
  price?: number;
  discountedPrice?: number;
  images?: { url?: string }[];
  category?: string;
  subCategory?: string;
  brand?: string;
  variants?: { stock?: number; isOutOfStock?: boolean; images?: { url?: string }[] }[];
};

type Page = { products?: FeedProduct[]; pagination?: { pages?: number } };

/**
 * Every active product, or null if any page fails. A partial feed is worse than
 * none: both platforms treat a product missing from the feed as deleted and stop
 * its ads, whereas a failed fetch makes them keep the last good copy.
 */
async function allProducts(): Promise<FeedProduct[] | null> {
  const out: FeedProduct[] = [];
  let pages = 1;
  for (let page = 1; page <= Math.min(pages, MAX_PAGES); page++) {
    const res = await api<Page>(`/product/filter?limit=${PAGE_SIZE}&page=${page}`, {
      version: "v2",
      raw: true,
      revalidate: CACHE_SECONDS,
    });
    if (!res?.products) return null;
    out.push(...res.products);
    pages = res.pagination?.pages ?? 1;
  }
  return out;
}

// XML 1.0 rejects these control characters outright; one in a seller's
// description would make the whole feed unparseable.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const ENTITY: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" };
const esc = (s: string) => s.replace(CONTROL, "").replace(/[<>&'"]/g, (c) => ENTITY[c]);

const clip = (s: string | undefined, max: number) => (s ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const amount = (n: number) => `${n.toFixed(2)} INR`;
// Both platforms cap image size; the CDN resizes at the edge so raw phone photos never go out.
const img = (src: string) => imageLoader({ src, width: 1200, quality: 85 });

function item(p: FeedProduct): string | null {
  const price = p.price ?? 0;
  const urls = [...new Set([...(p.images ?? []), ...(p.variants ?? []).flatMap((v) => v.images ?? [])].map((i) => i.url).filter((u): u is string => !!u))];
  // Neither platform accepts an item without a price or an image.
  if (price <= 0 || urls.length === 0) return null;

  const title = clip(p.name, 150);
  if (!title) return null;
  const sale = p.discountedPrice && p.discountedPrice < price ? p.discountedPrice : undefined;
  // A product with no variants can't be added to a cart (the server matches a variant).
  const inStock = (p.variants ?? []).some((v) => !v.isOutOfStock && (v.stock ?? 0) > 0);
  const type = [p.category, p.subCategory].filter(Boolean).join(" > ");

  const fields: [string, string | undefined][] = [
    ["g:id", p._id],
    ["g:title", title],
    // Google requires a description; fall back to the title rather than drop the product.
    ["g:description", clip(p.description, 5000) || title],
    ["g:link", `${SITE}/product/${p._id}`],
    ["g:image_link", img(urls[0])],
    ...urls.slice(1, 11).map((u): [string, string] => ["g:additional_image_link", img(u)]),
    ["g:availability", inStock ? "in stock" : "out of stock"],
    ["g:price", amount(price)],
    ["g:sale_price", sale ? amount(sale) : undefined],
    // ponytail: the catalogue API exposes no condition field, and listings are
    // new stock today. Map the real field here if second-hand listings appear.
    ["g:condition", "new"],
    // ponytail: the catalogue API exposes no brand. Meta requires one of brand,
    // gtin or mpn, so unbranded items carry the store name.
    ["g:brand", clip(p.brand, 70) || "Zatch"],
    // No GTINs or MPNs exist for marketplace listings; saying so keeps Google
    // from disapproving every item for missing identifiers.
    ["g:identifier_exists", "no"],
    ["g:product_type", type || undefined],
  ];

  const body = fields
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `<${k}>${esc(v as string)}</${k}>`)
    .join("");
  return `<item>${body}</item>`;
}

export async function GET() {
  const products = await allProducts();
  if (!products) {
    // Tell the crawler to come back, so it keeps the last good feed in the meantime.
    return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
  }

  const items = products.map(item).filter(Boolean).join("\n");
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>` +
    `<title>Zatch</title><link>${SITE}</link><description>Zatch product catalogue</description>\n` +
    `${items}\n</channel></rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
    },
  });
}
