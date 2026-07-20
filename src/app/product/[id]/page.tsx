import Link from "next/link";
import { Star, ShoppingBag, Truck, ShieldCheck, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { ProductOrb, type OrbTone } from "@/components/ui/product-orb";
import { BargainBox } from "@/components/product/bargain-box";
import { catalog } from "@/lib/api";
import { sampleProducts } from "@/lib/placeholder";
import { inr } from "@/lib/utils";

const tones: OrbTone[] = ["cobalt", "coral", "violet", "slate"];

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fetched = await catalog.product(id);
  const product =
    fetched ?? sampleProducts.find((p) => p._id === id) ?? sampleProducts[0];

  const price = product.discountedPrice ?? product.price;
  const rating = product.analytics?.averageRating ?? 4.7;
  const colors = ["cobalt", "coral", "slate"] as OrbTone[];

  return (
    <PageShell>
      <nav className="px-1 py-5 text-sm text-muted">
        <Link href="/shop" className="hover:text-ink">
          Shop
        </Link>
        <span className="px-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* gallery */}
        <div className="card rounded-[2rem] p-6">
          <div className="aspect-square">
            <ProductOrb tone="cobalt" float className="h-full w-full" />
          </div>
          <div className="mt-4 flex gap-3">
            {tones.map((t, i) => (
              <div
                key={i}
                className="aspect-square w-20 rounded-2xl bg-surface-2 p-1"
              >
                <ProductOrb tone={t} className="h-full w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* details */}
        <div className="flex flex-col gap-4">
          <div className="card rounded-[2rem] p-6 sm:p-8">
            {product.brand && (
              <p className="text-[13px] font-semibold uppercase tracking-widest text-muted">
                {product.brand}
              </p>
            )}
            <h1 className="mt-1.5 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold text-ink">
              {product.name}
            </h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 font-medium text-ink">
                <Star className="h-3.5 w-3.5 fill-lime text-lime" />
                {rating}
              </span>
              <span className="text-muted">
                {product.analytics?.totalReviews ?? 318} reviews
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold text-ink">
                {inr(price)}
              </span>
              {product.discountedPrice && (
                <span className="text-lg text-muted line-through">
                  {inr(product.price)}
                </span>
              )}
            </div>

            <div className="mt-6">
              <p className="text-[13px] font-medium text-muted">Colour</p>
              <div className="mt-2 flex gap-2.5">
                {colors.map((c, i) => (
                  <button
                    key={c}
                    aria-label={`Colour ${i + 1}`}
                    className="h-10 w-10 rounded-full border-2 border-transparent p-0.5 ring-1 ring-hairline transition hover:border-ink"
                  >
                    <ProductOrb tone={c} className="h-full w-full" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button className="btn-ink inline-flex flex-1 items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold">
                <ShoppingBag className="h-[18px] w-[18px]" /> Add to cart
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                [Truck, "Free delivery"],
                [ShieldCheck, "Buyer protected"],
                [RefreshCw, "7-day returns"],
              ].map(([Icon, label], i) => {
                const I = Icon as typeof Truck;
                return (
                  <div key={i} className="rounded-2xl bg-surface-2 px-2 py-3">
                    <I className="mx-auto h-5 w-5 text-ink" />
                    <p className="mt-1.5 text-[12px] text-muted">{label as string}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <BargainBox
            listPrice={price}
            autoAcceptDiscount={product.bargainSettings?.autoAcceptDiscount ?? 15}
            maxDiscount={product.bargainSettings?.maximumDiscount ?? 30}
          />
        </div>
      </div>

      {product.description && (
        <div className="card mt-4 rounded-[2rem] p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-ink">Details</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            {product.description}
          </p>
        </div>
      )}
    </PageShell>
  );
}
