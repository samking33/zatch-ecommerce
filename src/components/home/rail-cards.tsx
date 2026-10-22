"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { Play, Heart } from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { compact, inr } from "@/lib/utils";
import { FollowButton } from "@/components/seller/follow-button";
import type { Bit, LiveSession, Product } from "@/lib/types";

export type RailSeller = {
  _id: string; username?: string; businessName?: string; profilePic?: { url?: string };
  followerCount?: number; isFollowing?: boolean;
};

function videoUrl(b: Bit) {
  if (!b.video) return undefined;
  return typeof b.video === "string" ? b.video : b.video.url;
}

/** Video card: tall poster with a viewer pill and seller strip, title beneath. */
export function VideoRailCard({ bit, onOpen }: { bit: Bit; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const src = videoUrl(bit);
  const product = bit.products?.[0];
  // Ignore zero/missing prices so the badge never reads as a free item.
  const raw = product?.discountedPrice ?? product?.price;
  const price = raw && raw > 0 ? raw : undefined;

  function preview() {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().then(() => setPlaying(true)).catch(() => {});
  }
  function stop() {
    const v = ref.current;
    if (!v) return;
    v.pause(); v.currentTime = 0; setPlaying(false);
  }

  return (
    <button
      onClick={onOpen}
      onMouseEnter={preview}
      onMouseLeave={stop}
      onFocus={preview}
      onBlur={stop}
      className="w-[168px] shrink-0 snap-start text-left focus-visible:outline-none sm:w-[196px] lg:w-[224px]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ink">
        <ProductMedia
          src={bit.thumbnail?.url}
          alt={bit.title ?? "Video"}
          tone="violet"
          sizes="224px"
          className="absolute inset-0 h-full w-full"
        />
        {src && (
          <video
            ref={ref} src={src} muted loop playsInline preload="none"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {price != null && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold text-lime-ink">
            {inr(price)}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-ink/85 to-transparent px-2.5 pb-2.5 pt-8">
          <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white/25 text-[10px] font-bold text-white">
            {bit.uploadedBy?.profilePic?.url
              ? <Image src={bit.uploadedBy.profilePic.url} alt="" width={24} height={24} className="h-full w-full object-cover" />
              : (bit.uploadedBy?.username?.[0] ?? "Z").toUpperCase()}
          </span>
          <span className="truncate text-[12px] font-medium text-white">{bit.uploadedBy?.username ?? "Zatch seller"}</span>
          <span className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-ink">
            <Play className="h-3 w-3 translate-x-px fill-current" />
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[14px] leading-snug text-ink">{bit.title}</p>
      <p className="mt-0.5 text-[12px] text-muted">{compact(bit.viewCount ?? 0)} views</p>
    </button>
  );
}

/** Live card: same shape, with a viewer-count pill instead of a price. */
export function LiveRailCard({ session }: { session: LiveSession }) {
  return (
    <Link href={`/live/${session._id}`} className="w-[168px] shrink-0 snap-start sm:w-[196px] lg:w-[224px]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ink">
        <ProductMedia src={session.thumbnail?.url} alt={session.title} tone="coral" sizes="224px" className="absolute inset-0 h-full w-full" />
        {/* /live/sessions also lists shows starting soon, so only on-air ones say LIVE. */}
        {session.status === "live" ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold text-lime-ink">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-lime-ink" />
            LIVE · {compact(session.viewersCount ?? 0)}
          </span>
        ) : (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink">Starting soon</span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-ink/85 to-transparent px-2.5 pb-2.5 pt-8">
          <span className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-white text-ink">
            <Play className="h-3 w-3 translate-x-px fill-current" />
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[14px] leading-snug text-ink">{session.title}</p>
    </Link>
  );
}

/** Seller card for the "Explore sellers" row, with follow (as in the app's home). */
export function SellerRailCard({ seller }: { seller: RailSeller }) {
  const name = seller.businessName || seller.username || "Seller";
  return (
    <div className="flex w-[168px] shrink-0 snap-start flex-col items-center rounded-xl bg-surface-2 p-4 text-center sm:w-[196px]">
      <Link href={`/seller/${seller._id}`} className="flex flex-col items-center">
        <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-surface text-xl font-semibold text-ink">
          {seller.profilePic?.url
            ? <Image src={seller.profilePic.url} alt={name} width={64} height={64} className="h-full w-full object-cover" />
            : name[0]?.toUpperCase()}
        </span>
        <span className="mt-2 line-clamp-1 text-[14px] font-medium text-ink">{name}</span>
        <span className="text-[12px] text-muted">{compact(seller.followerCount ?? 0)} followers</span>
      </Link>
      <div className="mt-3">
        <FollowButton userId={seller._id} initialFollowing={seller.isFollowing} followers={seller.followerCount ?? 0} compact />
      </div>
    </div>
  );
}

/** Product card: image tile, then title and price underneath. */
export function ProductRailCard({ product }: { product: Product }) {
  const price = product.discountedPrice ?? product.price;
  const was = product.discountedPrice && product.discountedPrice < product.price ? product.price : null;

  return (
    <Link href={`/product/${product._id}`} className="group w-[168px] shrink-0 snap-start sm:w-[196px] lg:w-[224px]">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
        <ProductMedia src={product.images?.[0]?.url} alt={product.name} tone="cobalt" sizes="224px" className="h-full w-full" />
        <span className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink opacity-0 transition-opacity group-hover:opacity-100">
          <Heart className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[14px] leading-snug text-ink">{product.name}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-[17px] font-semibold text-ink">{inr(price)}</span>
        {was && <span className="text-[13px] text-muted line-through">{inr(was)}</span>}
      </p>
    </Link>
  );
}
