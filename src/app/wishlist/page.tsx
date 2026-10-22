import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductCard } from "@/components/ui/product-card";
import { users, products as productsApi, bits as bitsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Product, Bit } from "@/lib/types";

export const metadata = { title: "Saved & liked" };
export const dynamic = "force-dynamic";

type Ref = string | { _id: string };
type Profile = { savedProducts?: Ref[]; likedProducts?: Ref[]; savedBits?: Ref[] };

const idOf = (r: Ref) => (typeof r === "string" ? r : r?._id);

const TABS = [
  { key: "saved", label: "Saved" },
  { key: "liked", label: "Liked" },
  { key: "bits", label: "Saved Bits" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await serverToken();
  if (!t) {
    return <PageShell><div className="pt-6"><SignInRequired what="your saved items" /></div></PageShell>;
  }

  const { tab: requested } = await searchParams;
  const tab: Tab = TABS.find((x) => x.key === requested)?.key ?? "saved";
  const profile = (await users.profile(t)) as Profile | null;
  const ids = (list?: Ref[]) => [...new Set((list ?? []).map(idOf).filter(Boolean))] as string[];
  const lists = { saved: ids(profile?.savedProducts), liked: ids(profile?.likedProducts), bits: ids(profile?.savedBits) };

  // ponytail: one request per item - the backend has no bulk-by-ids endpoint.
  // Only the open tab is fetched, capped at 24 so a big list can't stall the page.
  const shown = lists[tab].slice(0, 24);
  const [items, savedBits] = await Promise.all([
    tab === "bits" ? [] : Promise.all(shown.map((id) => productsApi.get(id))).then((r) => r.filter(Boolean) as Product[]),
    tab === "bits" ? Promise.all(shown.map((id) => bitsApi.get(id, t))).then((r) => r.filter(Boolean) as Bit[]) : [],
  ]);

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="Saved & liked" sub="Everything you've saved or hearted, ready to bargain on." />

      <div role="tablist" className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((x) => (
          <Link key={x.key} role="tab" aria-selected={x.key === tab} href={x.key === "saved" ? "/wishlist" : `/wishlist?tab=${x.key}`}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${x.key === tab ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}>
            {x.label} ({lists[x.key].length})
          </Link>
        ))}
      </div>

      {items.length === 0 && savedBits.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-live">
            <Heart className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            {tab === "liked" ? "Nothing liked yet" : "Nothing saved yet"}
          </h2>
          <p className="mt-2 text-muted">
            {tab === "liked" ? "Tap the heart on any product to keep it here." : tab === "bits" ? "Tap Save on any Bit to keep it here." : "Tap Save on any product to keep it here."}
          </p>
          <Link href={tab === "bits" ? "/bits" : "/shop"} className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
            {tab === "bits" ? "Watch Bits" : "Browse products"}
          </Link>
        </div>
      ) : tab !== "bits" ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => <ProductCard key={p._id} product={p} i={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {savedBits.map((b) => (
            <Link key={b._id} href={`/bits?bit=${b._id}`} className="card card-hover overflow-hidden rounded-2xl p-2">
              <div className="relative aspect-[9/14] overflow-hidden rounded-xl bg-surface-2">
                {b.thumbnail?.url && (
                  <Image src={b.thumbnail.url} alt={b.title ?? "Bit"} fill sizes="200px" className="object-cover" />
                )}
              </div>
              <p className="line-clamp-1 px-1 pt-2 text-[13px] font-medium text-ink">{b.title}</p>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
