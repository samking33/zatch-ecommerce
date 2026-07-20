import Link from "next/link";
import { ArrowUpRight, Play, Star, Heart } from "lucide-react";
import { ProductOrb, type OrbTone } from "@/components/ui/product-orb";
import { compact, inr } from "@/lib/utils";
import type { Category, LiveSession, Product } from "@/lib/types";

const dotTones: { tone: OrbTone; hex: string }[] = [
  { tone: "cobalt", hex: "#2743c9" },
  { tone: "coral", hex: "#ff5a45" },
  { tone: "lime", hex: "#b4e81f" },
  { tone: "violet", hex: "#8b46e0" },
  { tone: "slate", hex: "#9aa6bd" },
];

export function CategoryCard({ categories }: { categories: Category[] }) {
  return (
    <div className="card card-hover rounded-[1.75rem] p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          Shop by category
        </h2>
        <Link href="/shop" aria-label="All categories" className="btn-ink grid h-8 w-8 place-items-center rounded-full">
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {categories.slice(0, 6).map((c, i) => (
          <Link
            key={c._id}
            href={`/category/${c.slug}`}
            className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
          >
            <span
              className="h-6 w-6 rounded-full"
              style={{ background: dotTones[i % dotTones.length].hex }}
            />
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GoingLiveCard({ session }: { session?: LiveSession }) {
  return (
    <Link
      href={session ? `/live/${session.channelName}` : "/live"}
      className="card card-hover group relative flex flex-1 flex-col overflow-hidden rounded-[1.75rem] p-3"
    >
      <div className="relative flex-1 overflow-hidden rounded-[1.25rem] bg-surface-2">
        <ProductOrb tone="coral" float className="absolute inset-0 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Live
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {compact(session?.viewersCount ?? 1834)} watching
        </span>
        <span className="btn-ink absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full">
          <ArrowUpRight className="h-4 w-4" />
        </span>
        <p className="absolute bottom-3 left-4 max-w-[70%] font-display text-lg font-semibold leading-tight text-white">
          {session?.title ?? "Flash bargains, live now"}
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
          <h2 className="font-display text-lg font-semibold text-ink">
            More deals
          </h2>
          <p className="text-sm text-muted">460+ items · fresh drops daily</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-live">
          <Heart className="h-[18px] w-[18px] fill-current" />
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {products.slice(0, 3).map((p, i) => (
          <Link
            key={p._id}
            href={`/product/${p._id}`}
            className="aspect-square rounded-2xl bg-surface-2 p-1 transition-transform hover:scale-[1.03]"
          >
            <ProductOrb tone={tones[i % tones.length]} className="h-full w-full" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function StatsCard() {
  return (
    <div className="card relative flex flex-col items-center justify-center overflow-hidden rounded-[1.75rem] p-6 text-center">
      <div className="flex -space-x-3">
        {["cobalt", "coral", "lime"].map((t, i) => (
          <span
            key={i}
            className="h-11 w-11 overflow-hidden rounded-full border-2 border-surface"
          >
            <ProductOrb tone={t as OrbTone} className="h-full w-full" />
          </span>
        ))}
      </div>
      <div className="mt-4 grid h-28 w-28 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#7aa2ff,#2743c9)] text-surface">
        <div>
          <p className="font-display text-2xl font-semibold leading-none">5M+</p>
          <p className="text-[11px] opacity-80">shoppers</p>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium text-ink">
        <Star className="h-4 w-4 fill-lime text-lime" />
        4.8 · 62k reviews
      </div>
    </div>
  );
}

export function BitsCard({ product }: { product?: Product }) {
  return (
    <Link
      href="/bits"
      className="card card-hover group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] p-6"
    >
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
          <p className="max-w-[9rem] font-display text-xl font-semibold leading-tight text-ink">
            {product?.name ?? "Unboxing the Aurora"}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-muted">
            <Star className="h-3.5 w-3.5 fill-lime text-lime" />
            {product?.analytics?.averageRating ?? 4.7}
          </p>
        </div>
        <div className="h-24 w-24 shrink-0">
          <ProductOrb tone="lime" float className="h-full w-full" />
        </div>
      </div>
    </Link>
  );
}
