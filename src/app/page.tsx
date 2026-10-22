import Link from "next/link";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { HeroBanner } from "@/components/home/hero-banner";
import { Rail } from "@/components/home/rail";
import { VideoRail } from "@/components/home/video-rail";
import { LiveRailCard, ProductRailCard, SellerRailCard, type RailSeller } from "@/components/home/rail-cards";
import { api, catalog, users } from "@/lib/api";
import type { Bit } from "@/lib/types";
import { serverToken } from "@/lib/session";

export const metadata = {
  title: "Zatch - Watch it. Want it. Name your price.",
};

export default async function HomePage() {
  const t = await serverToken();
  // Same rows as the app's home: live, Bits, top picks, trending, sellers to follow.
  const [topPicks, live, bits, trending, sellers] = await Promise.all([
    catalog.topPicks(t),
    catalog.liveSessions(t),
    catalog.bits(t),
    api<{ bits?: Bit[] }>("/trending/trending", { token: t, raw: true }),
    t ? (users.all(t, { limit: "12" }) as Promise<RailSeller[] | null>) : Promise.resolve(null),
  ]);

  const products = topPicks ?? [];
  const sessions = live ?? [];
  const onAir = sessions.filter((s) => s.status === "live");
  const soon = sessions.filter((s) => s.status !== "live");
  const bitList = bits ?? [];
  const trendingBits = trending?.bits ?? [];
  const sellerList = sellers ?? [];
  // api() returns null when a request fails (empty lists come back as []).
  const failed = topPicks === null && live === null && bits === null;

  // Video leads, so split the feed into rails and let the rest fall below.
  const feed = bitList.slice(0, 20);
  const moreFeed = bitList.slice(20, 40);
  const rest = bitList.slice(40);

  // Real imagery for the hero collage so it never shows a placeholder orb:
  // live thumbnails first, then bit thumbnails, then product photos.
  const heroMedia = [
    ...sessions.map((s) => s.thumbnail?.url),
    ...bitList.map((b) => b.thumbnail?.url),
    ...products.flatMap((p) => p.images?.map((im) => im.url) ?? []),
  ].filter((u): u is string => !!u);
  const heroImages = Array.from(new Set(heroMedia)).slice(0, 4);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-16 pt-2 sm:px-5">
        <HeroBanner liveCount={onAir.length} topProduct={products[0]} topBit={bitList[0]} images={heroImages} />

        {feed.length > 0 && (
          <VideoRail
            title="Shop the feed"
            sub="Tap any video to buy what is in it, or make an offer."
            href="/bits"
            bits={feed}
          />
        )}

        {onAir.length > 0 && (
          <Rail title="Live right now" sub="Join a stream and negotiate in the chat." href="/live">
            {onAir.map((s) => <LiveRailCard key={s._id} session={s} />)}
          </Rail>
        )}

        {soon.length > 0 && (
          <Rail title="Starting soon" sub="Shows going live in the next few minutes." href="/live">
            {soon.map((s) => <LiveRailCard key={s._id} session={s} />)}
          </Rail>
        )}

        {products.length > 0 && (
          <Rail title="Today's picks" sub="Every price here is a starting point." href="/picks">
            {products.map((p) => <ProductRailCard key={p._id} product={p} />)}
          </Rail>
        )}

        {trendingBits.length > 0 && (
          <VideoRail title="Trending" sub="What everyone is watching this week." href="/trending" bits={trendingBits} />
        )}

        {sellerList.length > 0 && (
          <Rail title="Explore sellers" sub="Follow sellers to see their lives and drops first." href="/sellers">
            {sellerList.map((s) => <SellerRailCard key={s._id} seller={s} />)}
          </Rail>
        )}

        {moreFeed.length > 0 && (
          <VideoRail title="More to watch" sub="Fresh drops from sellers across India." href="/bits" bits={moreFeed} />
        )}

        {/* Everything else keeps flowing below as sellers upload. */}
        {rest.length > 0 && (
          <VideoRail title="Keep scrolling" sub="The rest of the feed." href="/bits" bits={rest} />
        )}

        {failed ? (
          <div role="alert" className="card mt-10 grid place-items-center rounded-[2rem] px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold text-ink">We couldn&apos;t load the feed</p>
            <p className="mt-2 text-muted">Check your connection and try again in a moment.</p>
            <Link href="/" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Try again</Link>
          </div>
        ) : products.length === 0 && bitList.length === 0 && sessions.length === 0 && (
          <div className="card mt-10 grid place-items-center rounded-[2rem] px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold text-ink">Nothing here yet</p>
            <p className="mt-2 text-muted">Sellers are setting up. Check back soon for live shows and drops.</p>
            <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Browse products</Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
