import Link from "next/link";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";

export const metadata = { title: "Today's picks" };

// The home row's "See all", as the app's top picks screen.
export default async function PicksPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: raw } = await searchParams;
  const page = Math.max(1, Math.min(500, Number.parseInt(raw ?? "1", 10) || 1));
  const t = await serverToken();
  const data = await catalog.topPicksPage(page, t);
  const items = data?.products ?? [];
  const pages = data?.pagination?.totalPages ?? 1;

  return (
    <PageShell>
      <PageHeader eyebrow="Top picks" title="Today's picks" sub="Every price here is a starting point." />
      {items.length === 0 ? (
        <div className="card rounded-[2rem] p-10 text-center">
          <p className="text-muted">{data ? "No picks right now. Check back soon." : "We couldn't load the picks. Refresh to try again."}</p>
          <Link href="/shop" className="pill-lime mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold">Browse products</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3 text-sm">
              {page > 1 && <Link href={page === 2 ? "/picks" : `/picks?page=${page - 1}`} className="rounded-full border border-hairline px-4 py-2 font-medium text-ink hover:bg-surface-2">Previous</Link>}
              <span className="text-muted">Page {page} of {pages}</span>
              {page < pages && <Link href={`/picks?page=${page + 1}`} className="rounded-full border border-hairline px-4 py-2 font-medium text-ink hover:bg-surface-2">Next</Link>}
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}
