import Link from "next/link";
import { ArrowUpRight, Twitter, Instagram, Youtube } from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { BargainTicker } from "./bargain-ticker";
import type { Product } from "@/lib/types";

export function Hero({
  liveCount = 0,
  product,
}: {
  liveCount?: number;
  product?: Product;
}) {
  const name = product?.name ?? "Live drop";
  const listPrice = product?.price ?? 8990;
  const dealPrice = product?.discountedPrice;
  const img = product?.images?.[0]?.url;

  return (
    <section className="card relative flex flex-col overflow-hidden rounded-[2rem] p-7 sm:p-9 lg:col-span-8 lg:min-h-[32rem]">
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-lime/25 blur-3xl" />

      <div className="relative grid flex-1 gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-hairline bg-surface-2/80 py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium text-ink backdrop-blur">
            <span className="live-dot grid h-2 w-2 place-items-center rounded-full bg-live" />
            {liveCount > 0 ? `${liveCount} sellers live now` : "India's live bargain market"}
          </span>

          <h1 className="mt-6 text-balance font-display text-[clamp(2.7rem,5.4vw,4.4rem)] font-semibold text-ink">
            Name your price.
            <br />
            <span className="text-muted">Live.</span>
          </h1>

          <div className="mt-7 flex items-start gap-4">
            <span className="font-display text-2xl font-semibold [color:rgba(18,20,14,0.25)]">
              01
            </span>
            <div className="max-w-xs">
              <p className="font-display text-lg font-semibold text-ink">Live bargaining</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                Make an offer and watch the seller counter in real time. No fixed
                prices — just the deal you strike.
              </p>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={product ? `/product/${product._id}` : "/shop"}
                className="pill-lime inline-flex items-center gap-3 rounded-full py-3.5 pl-6 pr-3.5 text-[15px] font-semibold"
              >
                Start bargaining
                <span className="btn-ink grid h-8 w-8 place-items-center rounded-full">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
              <Link
                href="/shop"
                className="rounded-full border border-hairline px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-surface-2"
              >
                Browse all
              </Link>
            </div>

            <div className="mt-7 flex items-center gap-3 text-muted">
              <span className="text-sm">Follow the drops</span>
              <div className="flex gap-2">
                {[Twitter, Instagram, Youtube].map((Icon, i) => (
                  <span
                    key={i}
                    className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-ink transition-colors hover:bg-canvas-deep"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* real featured product + live ticker */}
        <div className="relative min-h-[18rem]">
          <Link
            href={product ? `/product/${product._id}` : "/shop"}
            className="absolute inset-0 overflow-hidden rounded-[1.5rem] bg-surface-2"
          >
            <ProductMedia
              src={img}
              alt={name}
              tone="cobalt"
              float
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="h-full w-full"
            />
          </Link>
          <div className="absolute bottom-1 left-0 sm:-left-4">
            <BargainTicker productName={name} listPrice={listPrice} dealPrice={dealPrice} />
          </div>
        </div>
      </div>
    </section>
  );
}
