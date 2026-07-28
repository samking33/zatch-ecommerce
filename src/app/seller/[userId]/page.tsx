import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star, Package, Users as UsersIcon, Play, Radio } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { ProductMedia } from "@/components/ui/product-media";
import { FollowButton, ShareProfileButton } from "@/components/seller/follow-button";
import { users } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { compact } from "@/lib/utils";
import type { Product, Bit } from "@/lib/types";

export const dynamic = "force-dynamic";

type PublicSeller = {
  _id: string;
  username?: string;
  profilePic?: { url?: string };
  sellerProfile?: { businessName?: string };
  followerCount?: number;
  isFollowing?: boolean;
  customerRating?: number;
  productsSoldCount?: number;
  sellingProducts?: Product[];
  uploadedBits?: Bit[];
  upcomingLives?: { _id: string; title?: string; thumbnail?: { url?: string } }[];
};

export default async function SellerStorefront({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const seller = (await users.publicProfile(userId, await serverToken())) as PublicSeller | null;
  if (!seller?._id) notFound();

  const name = seller.sellerProfile?.businessName || seller.username || "Seller";
  const products = seller.sellingProducts ?? [];
  const bits = seller.uploadedBits ?? [];
  const lives = seller.upcomingLives ?? [];

  const stats = [
    { icon: UsersIcon, label: "Followers", value: compact(seller.followerCount ?? 0) },
    { icon: Package, label: "Sold", value: compact(seller.productsSoldCount ?? 0) },
    { icon: Star, label: "Rating", value: (seller.customerRating ?? 0) > 0 ? String(seller.customerRating) : "New" },
  ];

  return (
    <PageShell>
      <div className="card mt-5 rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-2xl font-semibold text-ink">
            {seller.profilePic?.url
              ? <Image src={seller.profilePic.url} alt={name} width={80} height={80} className="h-full w-full object-cover" />
              : name[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-semibold text-ink">{name}</h1>
            {seller.username && seller.sellerProfile?.businessName && (
              <p className="text-[15px] text-muted">@{seller.username}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4">
              {stats.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <s.icon className="h-4 w-4" />
                  <span className="font-semibold text-ink">{s.value}</span> {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5">
            <FollowButton userId={seller._id} initialFollowing={seller.isFollowing} followers={seller.followerCount ?? 0} />
            <ShareProfileButton userId={seller._id} />
          </div>
        </div>
      </div>

      {lives.length > 0 && (
        <section className="mt-8">
          <h2 className="px-1 font-display text-xl font-semibold text-ink">Upcoming live drops</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lives.map((l) => (
              <Link key={l._id} href={`/live/${l._id}`} className="card card-hover overflow-hidden rounded-[1.5rem] p-3">
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface-2">
                  <ProductMedia src={l.thumbnail?.url} alt={l.title ?? "Live"} tone="coral" sizes="33vw" className="h-full w-full" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold uppercase text-white backdrop-blur">
                    <Radio className="h-3 w-3" /> Scheduled
                  </span>
                </div>
                <p className="line-clamp-1 px-1 pt-2.5 text-[15px] font-medium text-ink">{l.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="px-1 font-display text-xl font-semibold text-ink">
          Products {products.length > 0 && <span className="text-muted">({products.length})</span>}
        </h2>
        {products.length === 0 ? (
          <div className="card mt-3 grid place-items-center rounded-[2rem] px-6 py-12 text-center">
            <p className="text-muted">This seller hasn&apos;t listed anything yet.</p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => <ProductCard key={p._id} product={p} i={i} />)}
          </div>
        )}
      </section>

      {bits.length > 0 && (
        <section className="mt-10">
          <h2 className="px-1 font-display text-xl font-semibold text-ink">Bits</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {bits.map((b) => (
              <Link key={b._id} href={`/bits?bit=${b._id}`} className="card card-hover overflow-hidden rounded-2xl p-2">
                <div className="relative aspect-[9/14] overflow-hidden rounded-xl bg-surface-2">
                  <ProductMedia src={b.thumbnail?.url} alt={b.title ?? "Bit"} tone="violet" sizes="200px" className="h-full w-full" />
                  <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-ink">
                    <Play className="h-3 w-3 fill-current" />
                  </span>
                </div>
                <p className="line-clamp-1 px-1 pt-2 text-[13px] font-medium text-ink">{b.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
