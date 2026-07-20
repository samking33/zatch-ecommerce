import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { catalog } from "@/lib/api";
import { sampleProducts, sampleCategories } from "@/lib/placeholder";

export const metadata = { title: "Shop all" };

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    catalog.products(),
    catalog.categories(),
  ]);

  const items = products?.length ? products : sampleProducts;
  const cats = categories?.length ? categories : sampleCategories;
  // Pad the grid so the layout reads full even with a small sample set.
  const grid = Array.from({ length: 8 }, (_, i) => items[i % items.length]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Marketplace"
        title="Everything, up for negotiation"
        sub="Browse the full catalogue. Every price is a starting point — make an offer on anything."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface">
          All
        </button>
        {cats.map((c) => (
          <button
            key={c._id}
            className="rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {grid.map((p, i) => (
          <ProductCard key={`${p._id}-${i}`} product={p} i={i} />
        ))}
      </div>
    </PageShell>
  );
}
