"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Heart, ShoppingBag, X } from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { type OrbTone } from "@/components/ui/product-orb";
import { compact } from "@/lib/utils";
import { bits as bitsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import type { Bit } from "@/lib/types";

const tones: OrbTone[] = ["violet", "coral", "cobalt", "lime", "slate"];

function videoUrl(b: Bit): string | undefined {
  if (!b.video) return undefined;
  return typeof b.video === "string" ? b.video : b.video.url;
}

export function BitsFeed({ bits }: { bits: Bit[] }) {
  const [active, setActive] = useState<Bit | null>(null);

  function open(b: Bit) {
    setActive(b);
    const t = getToken();
    if (t) bitsApi.view(b._id); // fire-and-forget real view count
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {bits.map((b, i) => (
          <button
            key={b._id}
            onClick={() => open(b)}
            className="card card-hover group relative flex aspect-[9/14] flex-col justify-between overflow-hidden rounded-[1.5rem] p-4 text-left"
          >
            <div className="absolute inset-0 -z-0">
              <ProductMedia src={b.thumbnail?.url} alt={b.title ?? "Bit"} tone={tones[i % tones.length]} sizes="(max-width: 640px) 50vw, 25vw" className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/5 to-transparent" />
            </div>
            <div className="relative flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink backdrop-blur transition-transform group-hover:scale-110">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <span className="rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {compact(b.viewCount ?? 0)} views
              </span>
            </div>
            <div className="relative">
              <p className="line-clamp-2 font-display text-[15px] font-semibold leading-tight text-white">{b.title ?? "Untitled"}</p>
              <div className="mt-2 flex items-center gap-3 text-white/85">
                <span className="inline-flex items-center gap-1 text-[13px]"><Heart className="h-3.5 w-3.5 fill-current" /> {compact(b.likeCount ?? 0)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/80 p-4 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-ink" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActive(null)} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink backdrop-blur">
              <X className="h-4 w-4" />
            </button>
            {videoUrl(active) ? (
              <video src={videoUrl(active)} poster={active.thumbnail?.url} controls autoPlay playsInline className="aspect-[9/16] w-full bg-black object-contain" />
            ) : (
              <div className="aspect-[9/16] w-full">
                <ProductMedia src={active.thumbnail?.url} alt={active.title ?? "Bit"} className="h-full w-full" />
              </div>
            )}
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="line-clamp-1 font-display text-[15px] font-semibold text-surface">{active.title}</p>
                <p className="text-sm text-white/60">{compact(active.viewCount ?? 0)} views · {compact(active.likeCount ?? 0)} likes</p>
              </div>
              <Link href="/shop" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-[13px] font-semibold text-lime-ink">
                <ShoppingBag className="h-3.5 w-3.5" /> Shop
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
