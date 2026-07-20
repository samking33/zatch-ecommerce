import Link from "next/link";
import { ArrowUpRight, Twitter, Instagram, Youtube } from "lucide-react";
import { ProductOrb } from "@/components/ui/product-orb";
import { BargainTicker } from "./bargain-ticker";

export function Hero({ liveCount = 128 }: { liveCount?: number }) {
  return (
    <section className="card relative flex flex-col overflow-hidden rounded-[2rem] p-7 sm:p-9 lg:col-span-8 lg:min-h-[32rem]">
      {/* ambient lime glow */}
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-lime/25 blur-3xl" />

      <div className="relative grid flex-1 gap-8 lg:grid-cols-[1.05fr_1fr]">
        {/* left column — the thesis */}
        <div className="flex flex-col">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-hairline bg-surface-2/80 py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium text-ink backdrop-blur">
            <span className="live-dot grid h-2 w-2 place-items-center rounded-full bg-live" />
            {liveCount} sellers live now
          </span>

          <h1 className="mt-6 text-balance font-display text-[clamp(2.7rem,5.4vw,4.4rem)] font-semibold text-ink">
            Name your price.
            <br />
            <span className="text-muted">Live.</span>
          </h1>

          <div className="mt-7 flex items-start gap-4">
            <span className="font-display text-2xl font-semibold text-hairline [color:rgba(18,20,14,0.25)]">
              01
            </span>
            <div className="max-w-xs">
              <p className="font-display text-lg font-semibold text-ink">
                Live bargaining
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                Make an offer and watch the seller counter in real time. No
                fixed prices — just the deal you strike.
              </p>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/live"
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

        {/* right column — floating product + live ticker */}
        <div className="relative min-h-[18rem]">
          <ProductOrb tone="cobalt" float className="absolute inset-0" />
          <div className="absolute bottom-1 left-0 sm:-left-4">
            <BargainTicker />
          </div>
        </div>
      </div>
    </section>
  );
}
