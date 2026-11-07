import Link from "next/link";
import { PageShell, PageHeader } from "@/components/site/page-shell";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <PageShell>
      <PageHeader eyebrow="404" title="This page doesn't exist" sub="The link may be old, or the product was removed." />
      <div className="flex flex-wrap gap-3 px-1">
        <Link href="/" className="pill-lime rounded-full px-6 py-3 text-sm font-semibold">Go to home</Link>
        <Link href="/shop" className="rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-2">Browse products</Link>
        <Link href="/seller/dashboard" className="rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-2">Seller dashboard</Link>
      </div>
    </PageShell>
  );
}
