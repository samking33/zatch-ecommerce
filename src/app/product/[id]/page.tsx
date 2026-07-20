import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/page-shell";
import { ProductView } from "@/components/product/product-view";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await catalog.product(id, await serverToken());
  if (!product) notFound();

  return (
    <PageShell>
      <nav className="px-1 py-5 text-sm text-muted">
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        <span className="px-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductView product={product} />

      {product.description && (
        <div className="card mt-4 rounded-[2rem] p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-ink">Details</h2>
          <p className="mt-3 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
            {product.description}
          </p>
        </div>
      )}
    </PageShell>
  );
}
