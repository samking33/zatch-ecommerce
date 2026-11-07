import Link from "next/link";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { AdRow } from "@/components/ads/ad-slot";
import { products as productsApi, categories as categoriesApi, ads as adsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { SortBar, PriceFilter, Pager, PAGE_SIZE, listingParams, listingHref } from "@/components/site/listing-controls";

export const metadata = { title: "Shop all" };

const ALL_SLUG = "explore-all";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; min?: string; max?: string; stock?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { category = "", sort = "", stock = "" } = sp;
  const { page, min, max } = listingParams(sp);
  const t = await serverToken();

  const [res, categories, listingAds] = await Promise.all([
    // `filter` honours category/price/stock; `products` does not.
    productsApi.filter(
      {
        category: category && category !== ALL_SLUG ? category : undefined,
        sortBy: sort || undefined,
        minPrice: min || undefined,
        maxPrice: max || undefined,
        hasStock: stock === "1" ? "true" : undefined,
        limit: PAGE_SIZE,
        page,
      },
      t,
    ),
    categoriesApi.list(),
    adsApi.list("product_listing"),
  ]);

  const items = res?.products ?? [];
  const pages = res?.pagination?.pages ?? 1;
  const current = { category, sort, min, max, stock };
  const cats = categories ?? [];
  const active = category || ALL_SLUG;

  const href = (slug: string) => {
    const p = new URLSearchParams();
    if (slug !== ALL_SLUG) p.set("category", slug);
    if (sort) p.set("sort", sort);
    const q = p.toString();
    return `/shop${q ? `?${q}` : ""}`;
  };
  return (
    <PageShell>
      <PageHeader
        eyebrow="Marketplace"
        title="Everything, up for negotiation"
        sub="Browse the full catalogue. Every price is a starting point - make an offer on anything."
      />

      {/* category pills - use each category's slug, the value products store */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Pill href={href(ALL_SLUG)} active={active === ALL_SLUG}>
          All
        </Pill>
        {cats
          .filter((c) => c.slug !== ALL_SLUG)
          .map((c) => (
            <Pill key={c._id} href={href(c.slug)} active={active === c.slug}>
              {c.name}
            </Pill>
          ))}
      </div>

      <SortBar current={sort} href={(k) => listingHref("/shop", { category, sort: k }, {})} />

      <PriceFilter action="/shop" keep={{ category, sort }} min={min} max={max} stock={stock}
        clearHref={listingHref("/shop", { category, sort }, {})} />

      <AdRow ads={listingAds ?? []} className="mb-4" />

      {items.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            {min || max || stock ? "Nothing matches these filters" : "Nothing in this category yet"}
          </p>
          <p className="mt-2 text-muted">{min || max || stock ? "Try a wider price range." : "Try another category or browse all."}</p>
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
      <Pager page={page} pages={pages} href={(n) => listingHref("/shop", current, { page: n })} />
    </PageShell>
  );
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-ink bg-ink text-surface"
          : "border-hairline bg-surface text-ink hover:bg-surface-2"
      }`}
    >
      {children}
    </Link>
  );
}
