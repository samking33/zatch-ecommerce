import Link from "next/link";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/home/hero";
import {
  CategoryCard,
  GoingLiveCard,
  MoreDealsCard,
  SpotlightCard,
  BitsCard,
} from "@/components/home/cards";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";

export const metadata = {
  title: "Zatch — Shop Live. Name Your Price.",
};

export default async function HomePage() {
  const t = await serverToken();
  const [topPicks, categories, live, bits] = await Promise.all([
    catalog.topPicks(t),
    catalog.categories(),
    catalog.liveSessions(t),
    catalog.bits(t),
  ]);

  const products = topPicks ?? [];
  const cats = categories ?? [];
  const sessions = live ?? [];
  const bitList = bits ?? [];

  const featured = products[0];
  const deals = products.slice(1, 4).length >= 3 ? products.slice(1, 4) : products.slice(0, 3);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-12">
          <Hero liveCount={sessions.length} product={featured} />
          <div className="flex flex-col gap-4 lg:col-span-4">
            <CategoryCard categories={cats} />
            <GoingLiveCard session={sessions[0]} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <MoreDealsCard products={deals} />
          <SpotlightCard product={products[4] ?? products[1] ?? featured} />
          <BitsCard bit={bitList[0]} />
        </div>

        {products.length === 0 && (
          <div className="card mt-4 grid place-items-center rounded-[2rem] px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold text-ink">Catalogue is loading</p>
            <p className="mt-2 text-muted">Sign in to browse live products and drops.</p>
            <Link href="/login" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
              Sign in
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
