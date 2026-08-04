"use client";

import { useEffect, useState } from "react";
import { Play, Heart, MessageCircle, ShoppingBag, Flame } from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { type OrbTone } from "@/components/ui/product-orb";
import { BitModal } from "./bit-modal";
import { compact } from "@/lib/utils";
import type { Bit } from "@/lib/types";

const tones: OrbTone[] = ["violet", "coral", "cobalt", "lime", "slate"];

export function BitsFeed({ bits }: { bits: Bit[] }) {
  const [active, setActive] = useState<Bit | null>(null);

  // Deep link support: /bits?bit=<id> opens that Bit directly (share links).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("bit");
    if (id) {
      const found = bits.find((b) => b._id === id);
      if (found) setActive(found);
    }
  }, [bits]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {bits.map((b, i) => (
          <button
            key={b._id}
            onClick={() => setActive(b)}
            className="card card-hover group relative flex aspect-[9/14] flex-col justify-between overflow-hidden rounded-[1.5rem] p-4 text-left"
          >
            <div className="absolute inset-0 -z-0">
              <ProductMedia src={b.thumbnail?.url} alt={b.title ?? "Bit"} tone={tones[i % tones.length]} sizes="(max-width: 640px) 50vw, 25vw" className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent" />
            </div>

            <div className="relative flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink backdrop-blur transition-transform group-hover:scale-110">
                <Play className="h-4 w-4 fill-current" />
              </span>
              {(b as { isTrending?: boolean }).isTrending && (
                <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-live px-2.5 py-1 text-[11px] font-semibold text-white">
                  <Flame className="h-3 w-3" /> Trending
                </span>
              )}
              {!!b.products?.length && (
                <span className="inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-lime-ink">
                  <ShoppingBag className="h-3 w-3" /> {b.products.length}
                </span>
              )}
            </div>

            <div className="relative">
              <p className="line-clamp-2 font-display text-[15px] font-semibold leading-tight text-white">{b.title ?? "Untitled"}</p>
              <div className="mt-2 flex items-center gap-3 text-white/85">
                <span className="inline-flex items-center gap-1 text-[13px]">
                  <Heart className={`h-3.5 w-3.5 ${b.isLiked ? "fill-live text-live" : "fill-current"}`} /> {compact(b.likeCount ?? 0)}
                </span>
                <span className="inline-flex items-center gap-1 text-[13px]">
                  <MessageCircle className="h-3.5 w-3.5" /> {compact(b.commentCount ?? 0)}
                </span>
                <span className="ml-auto text-[12px] text-white/70">{compact(b.viewCount ?? 0)} views</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {active && <BitModal bit={active} bits={bits} onClose={() => setActive(null)} />}
    </>
  );
}
