"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import type { Bit, Product } from "@/lib/types";

type Slide = {
  key: string;
  eyebrow?: string;
  title: string;
  sub: string;
  cta: string;
  href: string;
  bg: string;
  ink: string;
  image?: string;
};

/** Full-bleed rotating promo banner, the way marketplace homepages open.
 *  Slides are built from live data so it never shows a dead promo. */
export function HeroBanner({
  liveCount = 0,
  topProduct,
  topBit,
  images = [],
}: {
  liveCount?: number;
  topProduct?: Product;
  topBit?: Bit;
  images?: string[];
}) {
  const slides: Slide[] = [
    {
      key: "bargain",
      eyebrow: "India's live bargain marketplace",
      title: "Name your price",
      sub: "Every price is a starting point. Make an offer and the seller replies live.",
      cta: "Start bargaining",
      href: topProduct ? `/product/${topProduct._id}` : "/shop",
      bg: "#CAFE38",
      ink: "#12140E",
      image: topProduct?.images?.[0]?.url,
    },
    {
      key: "video",
      eyebrow: "Shop the feed",
      title: "Watch it. Want it.",
      sub: "Short videos from real sellers. Tap any clip to buy what is in it.",
      cta: "Watch videos",
      href: "/bits",
      bg: "#12140E",
      ink: "#FBFCF7",
      image: topBit?.thumbnail?.url,
    },
    {
      key: "live",
      eyebrow: liveCount > 0 ? `${liveCount} sellers streaming now` : "Live selling",
      title: "Deals, made on air",
      sub: "Join a stream, drop your offer in the chat, and close it before it ends.",
      cta: "Go to live",
      href: "/live",
      bg: "#FF5A45",
      ink: "#FFFFFF",
    },
  ];

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = slides[i];

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((n) => (n + 1) % slides.length), 6000);
    return () => clearTimeout(t);
  }, [i, paused, slides.length]);

  return (
    <section
      className="relative overflow-hidden rounded-[1.5rem] transition-colors duration-500"
      style={{ background: slide.bg }}
    >
      <div className="grid items-center gap-6 p-7 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div style={{ color: slide.ink }}>
          {slide.eyebrow && (
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] opacity-70">
              {slide.eyebrow}
            </p>
          )}
          <h1 className="mt-3 text-balance font-display text-[clamp(2.1rem,4.6vw,3.4rem)] font-semibold leading-[1.02] tracking-tight">
            {slide.title}
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed opacity-80">{slide.sub}</p>
          <Link
            href={slide.href}
            className="mt-6 inline-flex rounded-full px-6 py-3 text-[15px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: slide.ink, color: slide.bg }}
          >
            {slide.cta}
          </Link>
        </div>

        <HeroCollage images={images} slideImage={slide.image} slideKey={slide.key} />
      </div>

      {/* dots + transport, bottom right like the reference */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3">
        <div className="flex gap-1.5">
          {slides.map((s, n) => (
            <button
              key={s.key}
              onClick={() => setI(n)}
              aria-label={`Slide ${n + 1}`}
              className="h-2 w-2 rounded-full transition-opacity"
              style={{ background: slide.ink, opacity: n === i ? 1 : 0.35 }}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          <Ctl onClick={() => setI((n) => (n - 1 + slides.length) % slides.length)} label="Previous slide"><ChevronLeft className="h-4 w-4" /></Ctl>
          <Ctl onClick={() => setI((n) => (n + 1) % slides.length)} label="Next slide"><ChevronRight className="h-4 w-4" /></Ctl>
          <Ctl onClick={() => setPaused((p) => !p)} label={paused ? "Play" : "Pause"}>
            {paused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
          </Ctl>
        </div>
      </div>
    </section>
  );
}

/** Right-side showcase: a grid of real product/live imagery, never a mock orb.
 *  Falls back to the slide's own image, then the orb only if no media exists. */
function HeroCollage({ images, slideImage, slideKey }: { images: string[]; slideImage?: string; slideKey: string }) {
  // Lead with the slide's own image when it has one, then fill from the pool.
  const pool = Array.from(new Set([slideImage, ...images].filter((u): u is string => !!u)));

  if (pool.length === 0) {
    return (
      <div className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl lg:block">
        <ProductMedia src={undefined} alt="" tone={slideKey === "live" ? "coral" : "cobalt"} sizes="45vw" className="h-full w-full" />
      </div>
    );
  }

  // One large image when that's all we have; a 2x2 mosaic when we have more.
  if (pool.length < 4) {
    return (
      <div className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl lg:block">
        <ProductMedia src={pool[0]} alt="" tone={slideKey === "live" ? "coral" : "cobalt"} sizes="45vw" className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="hidden aspect-[16/10] grid-cols-2 grid-rows-2 gap-2 lg:grid">
      {pool.slice(0, 4).map((src, n) => (
        <div key={src + n} className="relative overflow-hidden rounded-xl">
          <ProductMedia src={src} alt="" tone={slideKey === "live" ? "coral" : "cobalt"} sizes="23vw" className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}

function Ctl({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink transition-colors hover:bg-white"
    >
      {children}
    </button>
  );
}
