import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { search as searchApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Product } from "@/lib/types";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = q ? await searchApi.query(q, await serverToken()) : null;
  const items = (results as Product[] | null) ?? [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Search"
        title={q ? `Results for “${q}”` : "Search Zatch"}
        sub={`${items.length} product${items.length !== 1 ? "s" : ""} found`}
      />
      {items.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            No matches
          </p>
          <p className="mt-2 text-muted">Try a different term or browse the shop.</p>
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
