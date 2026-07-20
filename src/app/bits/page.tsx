import Link from "next/link";
import { Play, Heart, ShoppingBag } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductMedia } from "@/components/ui/product-media";
import { type OrbTone } from "@/components/ui/product-orb";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { compact } from "@/lib/utils";

export const metadata = { title: "Bits" };

const tones: OrbTone[] = ["violet", "coral", "cobalt", "lime", "slate"];

export default async function BitsPage() {
  const bits = (await catalog.bits(await serverToken())) ?? [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Short video shopping"
        title="Bits"
        sub="Swipe through short product videos. Tap to buy or make an offer, straight from the clip."
      />
      {bits.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
            <Play className="h-5 w-5 fill-current" />
          </span>
          <p className="mt-4 font-display text-2xl font-semibold text-ink">No Bits right now</p>
          <p className="mt-2 text-muted">Check back soon for fresh product videos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {bits.map((b, i) => (
            <Link
              key={b._id}
              href="/bits"
              className="card card-hover group relative flex aspect-[9/14] flex-col justify-between overflow-hidden rounded-[1.5rem] p-4"
            >
              <div className="absolute inset-0 -z-0">
                <ProductMedia
                  src={b.thumbnail?.url}
                  alt={b.title ?? "Bit"}
                  tone={tones[i % tones.length]}
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="h-full w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/5 to-transparent" />
              </div>
              <div className="relative flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink backdrop-blur">
                  <Play className="h-4 w-4 fill-current" />
                </span>
                <span className="rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  {compact(b.viewCount ?? 0)} views
                </span>
              </div>
              <div className="relative">
                <p className="line-clamp-2 font-display text-[15px] font-semibold leading-tight text-white">
                  {b.title ?? "Untitled"}
                </p>
                <div className="mt-2 flex items-center gap-3 text-white/85">
                  <span className="inline-flex items-center gap-1 text-[13px]">
                    <Heart className="h-3.5 w-3.5 fill-current" /> {compact(b.likeCount ?? 0)}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-[12px] font-semibold text-lime-ink">
                    <ShoppingBag className="h-3.5 w-3.5" /> Shop
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
