import Link from "next/link";
import { Flame, Radio, Play } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { BitsFeed } from "@/components/bits/bits-feed";
import { ProductMedia } from "@/components/ui/product-media";
import { api } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { compact } from "@/lib/utils";
import type { Bit, LiveSession } from "@/lib/types";

export const metadata = { title: "Trending" };
export const dynamic = "force-dynamic";

type Trending = {
  bits?: Bit[];
  live?: LiveSession[];
  summary?: { totalLive?: number; totalBits?: number; total?: number };
};

export default async function TrendingPage() {
  const t = await serverToken();
  const data = (await api<Trending>("/trending/trending", { token: t, raw: true })) ?? {};
  const bits = data.bits ?? [];
  const live = data.live ?? [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Right now"
        title="Trending on Zatch"
        sub={`${data.summary?.total ?? bits.length + live.length} drops people can't stop watching.`}
      />

      {live.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 inline-flex items-center gap-2 px-1 font-display text-lg font-semibold text-ink">
            <Radio className="h-4 w-4 text-live" /> Live now
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((s) => (
              <Link key={s._id} href={`/live/${s._id}`} className="card card-hover overflow-hidden rounded-[1.5rem] p-3">
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface-2">
                  <ProductMedia src={s.thumbnail?.url} alt={s.title} tone="coral" sizes="33vw" className="h-full w-full" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[11px] font-semibold uppercase text-white">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Live
                  </span>
                </div>
                <p className="line-clamp-1 px-1 pt-2.5 text-[15px] font-medium text-ink">{s.title}</p>
                <p className="px-1 text-[13px] text-muted">{compact(s.viewersCount ?? 0)} watching</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 inline-flex items-center gap-2 px-1 font-display text-lg font-semibold text-ink">
          <Flame className="h-4 w-4" /> Trending Bits
        </h2>
        {bits.length === 0 ? (
          <div className="card grid place-items-center rounded-[2rem] px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
              <Play className="h-5 w-5 fill-current" />
            </span>
            <p className="mt-4 font-display text-xl font-semibold text-ink">Nothing trending yet</p>
            <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Browse products</Link>
          </div>
        ) : (
          <BitsFeed bits={bits} />
        )}
      </section>
    </PageShell>
  );
}
