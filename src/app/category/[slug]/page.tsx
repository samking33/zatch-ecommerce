import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { AdRow } from "@/components/ads/ad-slot";
import { SortBar, PriceFilter, Pager, PAGE_SIZE, listingParams, listingHref } from "@/components/site/listing-controls";
import { products as productsApi, categories as categoriesApi, ads as adsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { Category } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

// Each category gets its own tab title instead of the site default.
export async function generateMetadata({ params }: Params) {
  const decoded = decodeURIComponent((await params).slug);
  const cat = ((await categoriesApi.list()) as Category[] | null)?.find((c) => c.slug === decoded);
  return { title: cat?.name ?? decoded };
}

export default async function CategoryPage({
  params,
  searchParams,
}: Params & {
  searchParams: Promise<{ sub?: string; sort?: string; min?: string; max?: string; stock?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { sub = "", sort = "", stock = "" } = sp;
  const { page, min, max } = listingParams(sp);
  const decoded = decodeURIComponent(slug);
  const t = await serverToken();

  const [res, cats, listingAds] = await Promise.all([
    productsApi.filter(
      {
        category: decoded, subCategory: sub || undefined, sortBy: sort || undefined,
        minPrice: min || undefined, maxPrice: max || undefined, hasStock: stock === "1" ? "true" : undefined,
        limit: PAGE_SIZE, page,
      },
      t,
    ),
    categoriesApi.list(),
    adsApi.list("product_listing"),
  ]);

  // Ads (and anything else built from a category id) link by id; send those to the slug URL.
  if (/^[0-9a-f]{24}$/i.test(decoded)) {
    const byId = (cats as Category[] | null)?.find((c) => c._id === decoded);
    if (byId?.slug) redirect(`/category/${encodeURIComponent(byId.slug)}${sub ? `?sub=${encodeURIComponent(sub)}` : ""}`);
  }
  const cat = (cats as Category[] | null)?.find((c) => c.slug === decoded);
  const title = cat?.name ?? decoded;
  const subs = (cat?.subCategories ?? []) as { name: string; slug: string }[];
  const items = res?.products ?? [];
  const pages = res?.pagination?.pages ?? 1;
  const base = `/category/${slug}`;
  const current = { sub, sort, min, max, stock };
  const filtered = !!(min || max || stock);

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
            href={listingHref(base, { sort }, {})}
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
                href={listingHref(base, { sub: sslug, sort }, {})}
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

      <SortBar current={sort} href={(k) => listingHref(base, { sub, sort: k }, {})} />
      <PriceFilter action={base} keep={{ sub, sort }} min={min} max={max} stock={stock} clearHref={listingHref(base, { sub, sort }, {})} />

      <AdRow ads={listingAds ?? []} className="mb-4" />

      {items.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            {filtered ? "Nothing matches these filters" : "Nothing here yet"}
          </p>
          <p className="mt-2 text-muted">{filtered ? "Try a wider price range." : "Check another category or browse all."}</p>
          <Link href={filtered ? listingHref(base, { sub, sort }, {}) : "/shop"} className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
            {filtered ? "Clear filters" : "Browse all"}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (
            <ProductCard key={p._id} product={p} i={i} />
          ))}
        </div>
      )}
      <Pager page={page} pages={pages} href={(n) => listingHref(base, current, { page: n })} />
    </PageShell>
  );
}
