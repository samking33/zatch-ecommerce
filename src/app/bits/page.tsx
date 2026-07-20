import { Play } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { BitsFeed } from "@/components/bits/bits-feed";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";

export const metadata = { title: "Bits" };

export default async function BitsPage() {
  const bits = (await catalog.bits(await serverToken())) ?? [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Short video shopping"
        title="Bits"
        sub="Swipe through short product videos. Tap to play, then buy or make an offer straight from the clip."
      />
      {bits.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
            <Play className="h-5 w-5 fill-current" />
          </span>
          <p className="mt-4 font-display text-2xl font-semibold text-ink">No Bits right now</p>
          <p className="mt-2 text-muted">Check back soon for fresh product videos.</p>
        </div>
      ) : (
        <BitsFeed bits={bits} />
      )}
    </PageShell>
  );
}
