import Link from "next/link";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { products as productsApi, categories as categoriesApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Category } from "@/lib/types";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
}) {
  const { slug } = await params;
  const { sub = "" } = await searchParams;
  const decoded = decodeURIComponent(slug);
  const t = await serverToken();

  const [products, cats] = await Promise.all([
    productsApi.filter(
      { category: decoded, subCategory: sub || undefined, limit: 40 },
      t,
    ),
    categoriesApi.list(),
  ]);

  const cat = (cats as Category[] | null)?.find((c) => c.slug === decoded);
  const title = cat?.name ?? decoded;
  const subs = (cat?.subCategories ?? []) as { name: string; slug: string }[];
  const items = products?.length ? products : [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Category"
        title={title}
        sub="Make an offer on anything in this collection."
      />

      {subs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2.5">
          <Link
            href={`/category/${slug}`}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              !sub ? "border-ink bg-ink text-surface" : "border-hairline bg-surface text-ink hover:bg-surface-2"
            }`}
          >
            All {title}
          </Link>
          {subs.map((s) => {
            const sslug = typeof s === "string" ? s : s.slug ?? s.name;
            const sname = typeof s === "string" ? s : s.name;
            return (
              <Link
                key={sslug}
                href={`/category/${slug}?sub=${encodeURIComponent(sslug)}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  sub === sslug ? "border-ink bg-ink text-surface" : "border-hairline bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                {sname}
              </Link>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            Nothing here yet
          </p>
          <p className="mt-2 text-muted">Check another category or browse all.</p>
          <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
            Browse all
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (
            <ProductCard key={p._id} product={p} i={i} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
