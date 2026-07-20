import Link from "next/link";
import {
  ArrowUpRight, Play, Star, Heart, Flower2, BedDouble, Shirt, Sofa,
  Smartphone, Watch, Gem, LayoutGrid, type LucideIcon,
} from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { type OrbTone } from "@/components/ui/product-orb";
import { compact, inr } from "@/lib/utils";
import type { Bit, Category, LiveSession, Product } from "@/lib/types";

// Map each category to a clean icon + accent tint (check women before men —
// "women" contains the substring "men").
function catStyle(name: string): { Icon: LucideIcon; hex: string } {
  const n = name.toLowerCase();
  if (n.includes("beauty")) return { Icon: Flower2, hex: "#e0559c" };
  if (n.includes("bed") || n.includes("bath")) return { Icon: BedDouble, hex: "#22b8a6" };
  if (n.includes("accessor")) return n.includes("women")
    ? { Icon: Gem, hex: "#8b46e0" }
    : { Icon: Watch, hex: "#2743c9" };
  if (n.includes("fashion")) return n.includes("women")
    ? { Icon: Shirt, hex: "#e0559c" }
    : { Icon: Shirt, hex: "#2743c9" };
  if (n.includes("home") || n.includes("decor")) return { Icon: Sofa, hex: "#c07a2e" };
  if (n.includes("electronic")) return { Icon: Smartphone, hex: "#3a7ad4" };
  return { Icon: LayoutGrid, hex: "#6b6e63" };
}

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
        {list.map((c) => {
          const { Icon, hex } = catStyle(c.name);
          return (
            <Link
              key={c._id}
              href={`/category/${encodeURIComponent(c.slug)}`}
              className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full"
                style={{ background: `${hex}1f`, color: hex }}
              >
                <Icon className="h-[15px] w-[15px]" />
              </span>
              {c.name}
            </Link>
          );
        })}
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
    <Link href="/bits" className="card card-hover group relative overflow-hidden rounded-[1.75rem] p-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-surface-2">
        <ProductMedia src={bit?.thumbnail?.url} alt={bit?.title ?? "Bit"} tone="lime" sizes="(max-width:768px) 100vw, 33vw" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />

        {/* top row */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/85 py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium text-ink backdrop-blur">
            <Play className="h-3.5 w-3.5 fill-current" /> Trending on Bits
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {compact(bit?.viewCount ?? 0)} views
          </span>
        </div>

        {/* center play */}
        <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition-transform group-hover:scale-110">
          <Play className="h-6 w-6 translate-x-0.5 fill-current" />
        </span>

        {/* bottom title */}
        <div className="absolute inset-x-4 bottom-4">
          <p className="line-clamp-2 font-display text-lg font-semibold leading-tight text-white">
            {bit?.title ?? "Watch product videos"}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-white/85">
            <Heart className="h-3.5 w-3.5 fill-live text-live" /> {compact(bit?.likeCount ?? 0)}
          </p>
        </div>
      </div>
    </Link>
  );
}
