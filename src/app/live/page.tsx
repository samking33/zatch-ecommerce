import Link from "next/link";
import { Users, ArrowUpRight } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductOrb, type OrbTone } from "@/components/ui/product-orb";
import { catalog } from "@/lib/api";
import { sampleLive } from "@/lib/placeholder";
import { compact } from "@/lib/utils";

export const metadata = { title: "Live now" };

const tones: OrbTone[] = ["coral", "cobalt", "violet", "lime", "slate"];

export default async function LivePage() {
  const fetched = await catalog.liveSessions();
  const sessions = fetched?.length ? fetched : sampleLive;
  const grid = Array.from({ length: 6 }, (_, i) => sessions[i % sessions.length]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="On air"
        title="Sellers live right now"
        sub="Jump into a stream, drop your offer in the chat, and close the deal before it ends."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grid.map((s, i) => (
          <Link
            key={`${s._id}-${i}`}
            href={`/live/${s.channelName}`}
            className="card card-hover group relative flex flex-col overflow-hidden rounded-[1.75rem] p-3"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
              <ProductOrb tone={tones[i % tones.length]} className="h-full w-full" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Live
              </span>
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                <Users className="h-3 w-3" /> {compact(s.viewersCount ?? 900)}
              </span>
              <span className="btn-ink absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <div className="px-2 py-3.5">
              <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">
                {s.title}
              </p>
              <p className="mt-1 text-sm text-muted">Bargains open · tap to join</p>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
