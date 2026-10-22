import Link from "next/link";
import Image from "next/image";
import { TrendingUp, Clock, Search as SearchIcon, Play, Users as UsersIcon } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { api, search as searchApi, users } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { compact } from "@/lib/utils";
import type { Product } from "@/lib/types";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

// The nav search bar is desktop-only, so this page carries its own box -
// it's the only way to type a query on mobile. Plain GET form, no JS needed.
function SearchBox({ q }: { q: string }) {
  return (
    <form action="/search" role="search" className="relative mb-8 flex items-center">
      <SearchIcon className="pointer-events-none absolute left-5 h-[18px] w-[18px] text-muted" />
      <input
        name="q"
        type="search"
        defaultValue={q}
        autoFocus={!q}
        placeholder="Search products, sellers, live drops…"
        aria-label="Search products"
        className="h-14 w-full rounded-full border border-hairline bg-surface pl-12 pr-16 text-[16px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="btn-ink absolute right-2 grid h-10 w-10 place-items-center rounded-full"
      >
        <SearchIcon className="h-4 w-4" />
      </button>
    </form>
  );
}

type Popular = { query: string; searchCount?: number; type?: string; id?: string; name?: string; image?: string };
type HistoryEntry = { query: string; createdAt?: string; _id?: string };
type Person = { _id: string; username?: string; businessName?: string | null; profilePic?: { url?: string }; followerCount?: number; isSeller?: boolean };
type BitHit = { _id: string; title?: string; thumbnail?: { url?: string }; viewCount?: number };
type Results = { products?: Product[]; people?: Person[]; bits?: BitHit[]; categories?: { _id: string; name: string; slug?: string }[]; correctedQuery?: string };

// The app's tabs. The server returns all of them in one response.
const TABS = [
  { key: "", label: "All" },
  { key: "products", label: "Products" },
  { key: "people", label: "People" },
  { key: "bits", label: "Bits" },
] as const;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { q: raw = "", tab = "" } = await searchParams;
  const q = raw.trim().slice(0, 100);
  const t = await serverToken();
  // Same rule as the app: searches need at least 3 characters.
  const tooShort = q.length > 0 && q.length < 3;

  // With a query: results. Without: discovery (popular + your history).
  const [results, popular, history] = await Promise.all([
    q && !tooShort ? api<Results>(`/search/search?${new URLSearchParams({ query: q })}`, { token: t, raw: true, revalidate: 0 }) : Promise.resolve(null),
    q && !tooShort ? Promise.resolve(null) : (searchApi.popular() as Promise<Popular[] | null>),
    (q && !tooShort) || !t ? Promise.resolve(null) : (users.searchHistory(t) as Promise<HistoryEntry[] | null>),
  ]);

  const items = results?.products ?? [];
  const people = results?.people ?? [];
  const bits = results?.bits ?? [];
  const cats = results?.categories ?? [];
  const total = items.length + people.length + bits.length;
  const pop = popular ?? [];
  // De-dupe by query text; newest first.
  const hist = [
    ...new Set((history ?? []).map((h) => h?.query).filter(Boolean)),
  ].slice(0, 10) as string[];

  if (!q || tooShort) {
    return (
      <PageShell>
        <PageHeader eyebrow="Search" title="Search Zatch" sub="Find products, sellers and live drops." />
        <SearchBox q={q} />
        {tooShort && <p role="alert" className="-mt-5 mb-6 px-2 text-sm font-medium text-live">Please enter at least 3 characters to search.</p>}

        {hist.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 inline-flex items-center gap-2 px-1 font-display text-lg font-semibold text-ink">
              <Clock className="h-4 w-4" /> Recent searches
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {hist.map((h, i) => (
                <Link key={`${h}-${i}`} href={`/search?q=${encodeURIComponent(h)}`} className="rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">
                  {h}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 inline-flex items-center gap-2 px-1 font-display text-lg font-semibold text-ink">
            <TrendingUp className="h-4 w-4" /> Trending searches
          </h2>
          {pop.length === 0 ? (
            <div className="card grid place-items-center rounded-[2rem] px-6 py-12 text-center">
              <p className="text-muted">Nothing trending yet - try searching for anything.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pop.map((p, i) => (
                <Link
                  key={`${p.query}-${i}`}
                  href={p.id ? `/product/${p.id}` : `/search?q=${encodeURIComponent(p.query)}`}
                  className="card card-hover flex items-center gap-3 rounded-[1.25rem] p-3"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-muted">
                    {p.image ? <Image src={p.image} alt="" width={48} height={48} className="h-full w-full object-cover" /> : <SearchIcon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[15px] font-medium text-ink">{p.name ?? p.query}</p>
                    <p className="text-[13px] text-muted">
                      &ldquo;{p.query}&rdquo;{p.searchCount ? ` · ${p.searchCount} searches` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  const show = (k: string) => !tab || tab === k;
  const tabHref = (k: string) => `/search?${new URLSearchParams({ q, ...(k && { tab: k }) })}`;
  const counts: Record<string, number> = { "": total, products: items.length, people: people.length, bits: bits.length };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Search"
        title={`Results for “${q}”`}
        sub={
          results?.correctedQuery && results.correctedQuery.toLowerCase() !== q.toLowerCase()
            ? `Showing results for “${results.correctedQuery}”`
            : `${total} result${total !== 1 ? "s" : ""}`
        }
      />
      <SearchBox q={q} />
      <nav aria-label="Result types" className="-mt-4 mb-6 flex flex-wrap gap-1.5 text-sm">
        {TABS.map((x) => (
          <Link key={x.key} href={tabHref(x.key)} aria-current={(tab || "") === x.key ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${(tab || "") === x.key ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}>
            {x.label} <span className="opacity-60">{counts[x.key]}</span>
          </Link>
        ))}
      </nav>

      {!tab && cats.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link key={c._id} href={`/category/${c.slug ?? ""}`} className="rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">{c.name}</Link>
          ))}
        </div>
      )}

      {total === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
          <p className="font-display text-xl font-semibold text-ink">No matches</p>
          <p className="mt-2 text-muted">Try a different term or browse the shop.</p>
          <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Browse all</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {show("products") && (
            <Group title="Products" empty="No products found." count={items.length} more={!tab && items.length > 8 ? tabHref("products") : undefined}>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {(tab ? items : items.slice(0, 8)).map((p, i) => <ProductCard key={`${p._id}-${i}`} product={p} i={i} />)}
              </div>
            </Group>
          )}
          {show("people") && (
            <Group title="People" empty="No people found." count={people.length}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((u) => {
                  const name = u.businessName || u.username || "User";
                  return (
                    <Link key={u._id} href={`/seller/${u._id}`} className="card card-hover flex items-center gap-3 rounded-[1.25rem] p-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 font-semibold text-ink">
                        {u.profilePic?.url ? <Image src={u.profilePic.url} alt={name} width={48} height={48} className="h-full w-full object-cover" /> : name[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[15px] font-medium text-ink">{name}</p>
                        <p className="inline-flex items-center gap-1 text-[13px] text-muted">
                          <UsersIcon className="h-3 w-3" /> {compact(u.followerCount ?? 0)}{u.isSeller ? " · Seller" : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Group>
          )}
          {show("bits") && (
            <Group title="Bits" empty="No Bits found." count={bits.length}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {bits.map((b) => (
                  <Link key={b._id} href={`/bits?bit=${b._id}`} className="group">
                    <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-ink">
                      {b.thumbnail?.url && <Image src={b.thumbnail.url} alt={b.title ?? "Bit"} fill sizes="200px" className="object-cover" />}
                      <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white text-ink"><Play className="h-3 w-3 translate-x-px fill-current" /></span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[14px] text-ink">{b.title}</p>
                    <p className="text-[12px] text-muted">{compact(b.viewCount ?? 0)} views</p>
                  </Link>
                ))}
              </div>
            </Group>
          )}
        </div>
      )}
    </PageShell>
  );
}

function Group({ title, count, empty, more, children }: { title: string; count: number; empty: string; more?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {more && <Link href={more} className="text-sm font-medium text-muted hover:text-ink">See all</Link>}
      </div>
      {count === 0 ? <p className="px-1 text-[15px] text-muted">{empty}</p> : children}
    </section>
  );
}
