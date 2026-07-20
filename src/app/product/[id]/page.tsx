import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { type OrbTone } from "@/components/ui/product-orb";
import { ProductMedia } from "@/components/ui/product-media";
import { ProductPurchase } from "@/components/product/product-purchase";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";

const tones: OrbTone[] = ["cobalt", "coral", "violet", "slate"];

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await catalog.product(id, await serverToken());
  if (!product) notFound();

  const rating = product.averageRating ?? product.analytics?.averageRating ?? 0;
  const reviews = product.commentCount ?? product.analytics?.totalReviews ?? 0;
  const gallery = product.images?.length ? product.images.slice(0, 5) : [];

  return (
    <PageShell>
      <nav className="px-1 py-5 text-sm text-muted">
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        <span className="px-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* gallery */}
        <div className="card h-fit rounded-[2rem] p-6 lg:sticky lg:top-28">
          <div className="aspect-square overflow-hidden rounded-[1.5rem] bg-surface-2">
            <ProductMedia
              src={gallery[0]?.url}
              alt={product.name}
              tone="cobalt"
              float
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-full w-full"
            />
          </div>
          {gallery.length > 1 && (
            <div className="mt-4 flex gap-3">
              {gallery.map((im, i) => (
                <div key={i} className="aspect-square w-20 overflow-hidden rounded-2xl bg-surface-2 p-1">
                  <ProductMedia src={im.url} alt={`${product.name} ${i + 1}`} tone={tones[i % tones.length]} sizes="80px" className="h-full w-full rounded-xl" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* details + real purchase panel */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-1 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 font-medium text-ink">
              <Star className="h-3.5 w-3.5 fill-lime text-lime" />
              {rating > 0 ? rating.toFixed(1) : "New"}
            </span>
            <span className="text-muted">{reviews} reviews</span>
          </div>
          <ProductPurchase product={product} />
        </div>
      </div>

      {product.description && (
        <div className="card mt-4 rounded-[2rem] p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-ink">Details</h2>
          <p className="mt-3 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
            {product.description}
          </p>
        </div>
      )}
    </PageShell>
  );
}
