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

export default async function WishlistPage() {
  const t = await serverToken();
  if (!t) {
    return <PageShell><div className="pt-6"><SignInRequired what="your saved items" /></div></PageShell>;
  }

  const profile = (await users.profile(t)) as Profile | null;

  // De-dupe saved + liked into one product list.
  const ids = [
    ...new Set([...(profile?.savedProducts ?? []), ...(profile?.likedProducts ?? [])].map(idOf).filter(Boolean)),
  ] as string[];
  const bitIds = (profile?.savedBits ?? []).map(idOf).filter(Boolean) as string[];

  // ponytail: one request per saved item — the backend has no bulk-by-ids
  // endpoint. Capped at 24 so a big wishlist can't stall the page.
  const [items, savedBits] = await Promise.all([
    Promise.all(ids.slice(0, 24).map((id) => productsApi.get(id))).then((r) => r.filter(Boolean) as Product[]),
    Promise.all(bitIds.slice(0, 24).map((id) => bitsApi.get(id, t))).then((r) => r.filter(Boolean) as Bit[]),
  ]);

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="Saved & liked" sub="Everything you've hearted, ready to bargain on." />

      {items.length === 0 && savedBits.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-live">
            <Heart className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Nothing saved yet</h2>
          <p className="mt-2 text-muted">Tap the heart on any product or Bit to keep it here.</p>
          <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Browse products</Link>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p, i) => <ProductCard key={p._id} product={p} i={i} />)}
            </div>
          )}
          {savedBits.length > 0 && (
            <div className="mt-10">
              <h2 className="px-1 font-display text-xl font-semibold text-ink">Saved Bits</h2>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
