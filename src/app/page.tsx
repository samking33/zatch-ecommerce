import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/home/hero";
import {
  CategoryCard,
  GoingLiveCard,
  MoreDealsCard,
  StatsCard,
  BitsCard,
} from "@/components/home/cards";
import { catalog } from "@/lib/api";
import {
  sampleCategories,
  sampleProducts,
  sampleLive,
} from "@/lib/placeholder";

export default async function HomePage() {
  // Real data when the backend is up; sample data keeps the storefront whole.
  const [topPicks, categories, live] = await Promise.all([
    catalog.topPicks(),
    catalog.categories(),
    catalog.liveSessions(),
  ]);

  const products = topPicks?.length ? topPicks : sampleProducts;
  const cats = categories?.length ? categories : sampleCategories;
  const sessions = live?.length ? live : sampleLive;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-12">
          <Hero liveCount={sessions.length ? 128 : 0} />
          <div className="flex flex-col gap-4 lg:col-span-4">
            <CategoryCard categories={cats} />
            <GoingLiveCard session={sessions[0]} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <MoreDealsCard products={products} />
          <StatsCard />
          <BitsCard product={products[0]} />
        </div>
      </main>
      <Footer />
    </>
  );
}
