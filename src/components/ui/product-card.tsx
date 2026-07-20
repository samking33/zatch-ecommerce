import Link from "next/link";
import { Star, Tag } from "lucide-react";
import { ProductOrb, type OrbTone } from "./product-orb";
import { inr } from "@/lib/utils";
import type { Product } from "@/lib/types";

const tones: OrbTone[] = ["cobalt", "coral", "violet", "slate", "lime"];

export function ProductCard({ product, i = 0 }: { product: Product; i?: number }) {
  const price = product.discountedPrice ?? product.price;
  const off =
    product.discountedPrice && product.price > product.discountedPrice
      ? Math.round((1 - product.discountedPrice / product.price) * 100)
      : 0;
  // ponytail: Zatch is bargain-first, so the badge shows unless a seller
  // explicitly disabled it (maximumDiscount === 0).
  const canBargain = product.bargainSettings?.maximumDiscount !== 0;

  return (
    <Link
      href={`/product/${product._id}`}
      className="card card-hover group flex flex-col overflow-hidden rounded-[1.5rem] p-3"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
        <ProductOrb tone={tones[i % tones.length]} className="h-full w-full" />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-surface">
            −{off}%
          </span>
        )}
        {canBargain && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-lime-ink">
            <Tag className="h-3 w-3" /> Bargain
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-2 pb-1 pt-3.5">
        {product.brand && (
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
            {product.brand}
          </p>
        )}
        <p className="mt-0.5 line-clamp-1 font-display text-[15px] font-semibold text-ink">
          {product.name}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-semibold text-ink">
              {inr(price)}
            </span>
            {off > 0 && (
              <span className="text-[13px] text-muted line-through">
                {inr(product.price)}
              </span>
            )}
          </div>
          {product.analytics?.averageRating ? (
            <span className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
              <Star className="h-3.5 w-3.5 fill-lime text-lime" />
              {product.analytics.averageRating}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
