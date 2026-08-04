import Link from "next/link";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { HeroBanner } from "@/components/home/hero-banner";
import { Rail } from "@/components/home/rail";
import { VideoRail } from "@/components/home/video-rail";
import { LiveRailCard, ProductRailCard } from "@/components/home/rail-cards";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";

export const metadata = {
  title: "Zatch - Watch it. Want it. Name your price.",
};

export default async function HomePage() {
  const t = await serverToken();
  const [topPicks, live, bits] = await Promise.all([
    catalog.topPicks(t),
    catalog.liveSessions(t),
    catalog.bits(t),
  ]);

  const products = topPicks ?? [];
  const sessions = live ?? [];
  const bitList = bits ?? [];

  // Video leads, so split the feed into rails and let the rest fall below.
  const feed = bitList.slice(0, 20);
  const moreFeed = bitList.slice(20, 40);
  const rest = bitList.slice(40);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-16 pt-2 sm:px-5">
        <HeroBanner liveCount={sessions.length} topProduct={products[0]} topBit={bitList[0]} />

        {feed.length > 0 && (
          <VideoRail
            title="Shop the feed"
            sub="Tap any video to buy what is in it, or make an offer."
            href="/bits"
            bits={feed}
          />
        )}

        {sessions.length > 0 && (
          <Rail title="Live right now" sub="Join a stream and negotiate in the chat." href="/live">
            {sessions.map((s) => <LiveRailCard key={s._id} session={s} />)}
          </Rail>
        )}

        {products.length > 0 && (
          <Rail title="Today's picks" sub="Every price here is a starting point." href="/shop">
            {products.map((p) => <ProductRailCard key={p._id} product={p} />)}
          </Rail>
        )}

        {moreFeed.length > 0 && (
          <VideoRail title="More to watch" sub="Fresh drops from sellers across India." href="/bits" bits={moreFeed} />
        )}

        {/* Everything else keeps flowing below as sellers upload. */}
        {rest.length > 0 && (
          <VideoRail title="Keep scrolling" sub="The rest of the feed." href="/bits" bits={rest} />
        )}

        {products.length === 0 && bitList.length === 0 && (
          <div className="card mt-10 grid place-items-center rounded-[2rem] px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold text-ink">Catalogue is loading</p>
            <p className="mt-2 text-muted">Sign in to browse live products and drops.</p>
            <Link href="/login" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Sign in</Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
