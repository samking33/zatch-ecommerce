import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star, Users as UsersIcon } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { ProductView } from "@/components/product/product-view";
import { ProductReviews } from "@/components/product/product-social";
import { Rail } from "@/components/home/rail";
import { ProductRailCard } from "@/components/home/rail-cards";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { compact } from "@/lib/utils";
import imageLoader from "@/lib/image-loader";
import type { Product } from "@/lib/types";

const summary = (p: Product) => (p.description || `${p.name} on Zatch`).trim().replace(/\s+/g, " ").slice(0, 160);
// Share previews and Google fetch this, so it goes out through the CDN resizer, not as a raw upload.
const shareImage = (p: Product) => (p.images?.[0]?.url ? imageLoader({ src: p.images[0].url, width: 1200, quality: 85 }) : undefined);

// Without this every product shared on WhatsApp or Instagram showed the site's
// generic title and no photo, and every product page had the same <title>.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  // The same call the page makes, so Next serves both from one backend request.
  const product = await catalog.product(id, await serverToken());
  if (!product) return {};
  const description = summary(product);
  const image = shareImage(product);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product._id}` },
    openGraph: {
      type: "website",
      url: `/product/${product._id}`,
      title: product.name,
      description,
      images: image ? [{ url: image, width: 1200, alt: product.name }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: product.name, description, images: image ? [image] : undefined },
  };
}

/**
 * schema.org Product data, which makes the page eligible for Google's product
 * rich results and free Shopping listings. A rating is only claimed when real
 * reviews exist - Google penalises ratings with nothing behind them.
 */
function productJsonLd(p: Product) {
  const price = p.discountedPrice ?? p.price;
  const reviewCount = p.analytics?.totalReviews ?? 0;
  const rating = p.averageRating ?? p.analytics?.averageRating ?? 0;
  const inStock = (p.variants ?? []).some((v) => v.isOutOfStock !== true && (v.stock ?? 0) > 0);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: summary(p),
    image: (p.images ?? []).map((i) => i.url).filter(Boolean).slice(0, 5),
    sku: p._id,
    brand: { "@type": "Brand", name: p.brand || "Zatch" },
    offers: {
      "@type": "Offer",
      url: `https://live.zatch.shop/product/${p._id}`,
      priceCurrency: "INR",
      price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(reviewCount > 0 && rating > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount } } : {}),
  };
  // Seller-written text ends up inside a <script>; escaping "<" stops a "</script>"
  // in a description from breaking out of it.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await serverToken();
  const [product, picks] = await Promise.all([catalog.product(id, t), catalog.topPicks(t)]);
  if (!product) notFound();
  const seller = product.seller;
  const sellerName = seller?.businessName || seller?.username || "Seller";
  // Same lists as the app: top picks other than this one, and the ones from this seller.
  // Extras must never take the page down, so anything but a list counts as none.
  const others = (Array.isArray(picks) ? picks : []).filter((p) => p._id !== product._id);
  const fromSeller = seller ? others.filter((p) => (typeof p.sellerId === "string" ? p.sellerId : p.sellerId?._id) === seller._id || p.seller?._id === seller._id) : [];

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product) }} />
      <nav className="px-1 py-5 text-sm text-muted">
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        <span className="px-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductView product={product} />

      {product.description && (
        <div className="card mt-4 rounded-[2rem] p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-ink">Details</h2>
          <p className="mt-3 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
            {product.description}
          </p>
        </div>
      )}

      {seller && (
        <Link href={`/seller/${seller._id}`} className="card card-hover mt-4 flex items-center gap-4 rounded-[2rem] p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-lg font-semibold text-ink">
            {seller.profilePic?.url ? <Image src={seller.profilePic.url} alt={sellerName} width={56} height={56} className="h-full w-full object-cover" /> : sellerName[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">Sold by</p>
            <p className="line-clamp-1 font-display text-[17px] font-semibold text-ink">{sellerName}</p>
            <p className="mt-0.5 flex gap-3 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" /> {compact(seller.followerCount ?? 0)} followers</span>
              {(seller.customerRating ?? 0) > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-lime text-lime" /> {seller.customerRating}</span>}
            </p>
          </div>
          <span className="text-sm font-medium text-ink">View shop</span>
        </Link>
      )}
      <ProductReviews product={product} />
      {fromSeller.length > 0 && (
        <Rail title="More from this seller" href={seller ? `/seller/${seller._id}` : undefined}>
          {fromSeller.slice(0, 8).map((p) => <ProductRailCard key={p._id} product={p} />)}
        </Rail>
      )}
      {others.length > 0 && (
        <Rail title="Similar products" href="/shop">
          {others.slice(0, 8).map((p) => <ProductRailCard key={p._id} product={p} />)}
        </Rail>
      )}
    </PageShell>
  );
}
