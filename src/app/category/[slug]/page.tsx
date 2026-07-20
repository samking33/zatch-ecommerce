import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductCard } from "@/components/ui/product-card";
import { catalog } from "@/lib/api";
import { sampleProducts } from "@/lib/placeholder";

function titleCase(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await catalog.products(`?category=${slug}`);
  const items = products?.length ? products : sampleProducts;
  const grid = Array.from({ length: 8 }, (_, i) => items[i % items.length]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Category"
        title={titleCase(slug)}
        sub="Make an offer on anything in this collection."
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {grid.map((p, i) => (
          <ProductCard key={`${p._id}-${i}`} product={p} i={i} />
        ))}
      </div>
    </PageShell>
  );
}
