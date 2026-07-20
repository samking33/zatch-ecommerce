import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Play, Star, Heart } from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { type OrbTone } from "@/components/ui/product-orb";
import { compact, inr } from "@/lib/utils";
import type { Bit, Category, LiveSession, Product } from "@/lib/types";

const dotHex = ["#2743c9", "#ff5a45", "#b4e81f", "#8b46e0", "#9aa6bd", "#22b8a6"];

export function CategoryCard({ categories }: { categories: Category[] }) {
  const list = categories.filter((c) => c.slug !== "explore-all").slice(0, 6);
  return (
    <div className="card card-hover rounded-[1.75rem] p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Shop by category</h2>
        <Link href="/shop" aria-label="All categories" className="btn-ink grid h-8 w-8 place-items-center rounded-full">
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {list.map((c, i) => (
          <Link
            key={c._id}
            href={`/category/${encodeURIComponent(c.slug)}`}
            className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
          >
            {c.image?.url ? (
              <Image
                src={c.image.url}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="h-6 w-6 rounded-full" style={{ background: dotHex[i % dotHex.length] }} />
            )}
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GoingLiveCard({ session }: { session?: LiveSession }) {
  if (!session) {
    return (
      <Link
        href="/live"
        className="card card-hover group relative flex flex-1 flex-col justify-center rounded-[1.75rem] p-6 text-center"
      >
        <span className="mx-auto live-dot grid h-3 w-3 place-items-center rounded-full bg-live" />
        <p className="mt-4 font-display text-lg font-semibold text-ink">No live drops right now</p>
        <p className="mt-1 text-sm text-muted">Tap to catch the next one</p>
      </Link>
    );
  }
  return (
    <Link
      href={`/live/${session._id}`}
      className="card card-hover group relative flex flex-1 flex-col overflow-hidden rounded-[1.75rem] p-3"
    >
      <div className="relative flex-1 overflow-hidden rounded-[1.25rem] bg-surface-2">
        <ProductMedia src={session.thumbnail?.url} alt={session.title} tone="coral" float className="absolute inset-0 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Live
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {compact(session.viewersCount ?? 0)} watching
        </span>
        <span className="btn-ink absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full">
          <ArrowUpRight className="h-4 w-4" />
        </span>
        <p className="absolute bottom-3 left-4 max-w-[70%] font-display text-lg font-semibold leading-tight text-white">
          {session.title}
        </p>
      </div>
    </Link>
  );
}

export function MoreDealsCard({ products }: { products: Product[] }) {
  const tones: OrbTone[] = ["violet", "cobalt", "slate"];
  return (
    <div className="card card-hover rounded-[1.75rem] p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">More deals</h2>
          <p className="text-sm text-muted">Fresh drops, every price negotiable</p>
        </div>
        <Link href="/shop" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-live">
          <Heart className="h-[18px] w-[18px] fill-current" />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {products.slice(0, 3).map((p, i) => (
          <Link
            key={p._id}
            href={`/product/${p._id}`}
            className="aspect-square overflow-hidden rounded-2xl bg-surface-2 p-1 transition-transform hover:scale-[1.03]"
          >
            <ProductMedia src={p.images?.[0]?.url} alt={p.name} tone={tones[i % tones.length]} sizes="120px" className="h-full w-full rounded-xl" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// Real product spotlight (replaces the old mock "5M+" stat tile).
export function SpotlightCard({ product }: { product?: Product }) {
  if (!product) return <div className="card rounded-[1.75rem]" />;
  const price = product.discountedPrice ?? product.price;
  const rating = product.averageRating ?? product.analytics?.averageRating ?? 0;
  return (
    <Link href={`/product/${product._id}`} className="card card-hover flex flex-col overflow-hidden rounded-[1.75rem] p-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-surface-2">
        <ProductMedia src={product.images?.[0]?.url} alt={product.name} tone="cobalt" sizes="(max-width:768px) 100vw, 33vw" className="h-full w-full" />
        <span className="absolute left-3 top-3 rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-lime-ink">
          Top pick
        </span>
      </div>
      <div className="px-2 py-3">
        <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{product.name}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-ink">{inr(price)}</span>
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
              <Star className="h-3.5 w-3.5 fill-lime text-lime" /> {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function BitsCard({ bit }: { bit?: Bit }) {
  return (
    <Link href="/bits" className="card card-hover group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium text-ink">
          <Play className="h-3.5 w-3.5 fill-current" /> Trending on Bits
        </span>
        <span className="btn-ink grid h-8 w-8 place-items-center rounded-full">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <p className="line-clamp-2 max-w-[9rem] font-display text-xl font-semibold leading-tight text-ink">
            {bit?.title ?? "Watch product videos"}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-muted">
            <Heart className="h-3.5 w-3.5 fill-live text-live" /> {compact(bit?.likeCount ?? 0)}
          </p>
        </div>
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
          <ProductMedia src={bit?.thumbnail?.url} alt={bit?.title ?? "Bit"} tone="lime" float sizes="96px" className="h-full w-full" />
        </div>
      </div>
    </Link>
  );
}
