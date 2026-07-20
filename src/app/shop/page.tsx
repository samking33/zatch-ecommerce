import Link from "next/link";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { products as productsApi, categories as categoriesApi } from "@/lib/api";
import { serverToken } from "@/lib/session";

export const metadata = { title: "Shop all" };

const SORTS = [
  { key: "", label: "Newest" },
  { key: "popular", label: "Popular" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
];

const ALL_SLUG = "explore-all";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const { category = "", sort = "" } = await searchParams;
  const t = await serverToken();

  const [products, categories] = await Promise.all([
    // `filter` honours the category param; `products` does not.
    productsApi.filter(
      {
        category: category && category !== ALL_SLUG ? category : undefined,
        sortBy: sort || undefined,
        limit: 40,
      },
      t,
    ),
    categoriesApi.list(),
  ]);

  const items = products ?? [];
  const cats = categories ?? [];
  const active = category || ALL_SLUG;

  const href = (slug: string) => {
    const p = new URLSearchParams();
    if (slug !== ALL_SLUG) p.set("category", slug);
    if (sort) p.set("sort", sort);
    const q = p.toString();
    return `/shop${q ? `?${q}` : ""}`;
  };
  const sortHref = (key: string) => {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (key) p.set("sort", key);
    const q = p.toString();
    return `/shop${q ? `?${q}` : ""}`;
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Marketplace"
        title="Everything, up for negotiation"
        sub="Browse the full catalogue. Every price is a starting point — make an offer on anything."
      />

      {/* category pills — use each category's slug, the value products store */}
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

      {/* sort */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Sort:</span>
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={sortHref(s.key)}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              (sort || "") === s.key
                ? "bg-ink text-surface"
                : "text-ink hover:bg-surface-2"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            Nothing in this category yet
          </p>
          <p className="mt-2 text-muted">Try another category or browse all.</p>
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
