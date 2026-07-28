import Link from "next/link";
import Image from "next/image";
import { TrendingUp, Clock, Search as SearchIcon } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { search as searchApi, users } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Product } from "@/lib/types";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

type Popular = { query: string; searchCount?: number; type?: string; id?: string; name?: string; image?: string };
type HistoryEntry = { query: string; createdAt?: string; _id?: string };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const t = await serverToken();

  // With a query: results. Without: discovery (popular + your history).
  const [results, popular, history] = await Promise.all([
    q ? searchApi.query(q, t) : Promise.resolve(null),
    q ? Promise.resolve(null) : (searchApi.popular() as Promise<Popular[] | null>),
    q || !t ? Promise.resolve(null) : (users.searchHistory(t) as Promise<HistoryEntry[] | null>),
  ]);

  const items = (results as Product[] | null) ?? [];
  const pop = popular ?? [];
  // De-dupe by query text; newest first.
  const hist = [
    ...new Set((history ?? []).map((h) => h?.query).filter(Boolean)),
  ].slice(0, 10) as string[];

  if (!q) {
    return (
      <PageShell>
        <PageHeader eyebrow="Search" title="Search Zatch" sub="Find products, sellers and live drops." />

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
              <p className="text-muted">Nothing trending yet — try searching for anything.</p>
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

  return (
    <PageShell>
      <PageHeader
        eyebrow="Search"
        title={`Results for “${q}”`}
        sub={`${items.length} product${items.length !== 1 ? "s" : ""} found`}
      />
      {items.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
          <p className="font-display text-xl font-semibold text-ink">No matches</p>
          <p className="mt-2 text-muted">Try a different term or browse the shop.</p>
          <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Browse all</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (
            <ProductCard key={`${p._id}-${i}`} product={p} i={i} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
