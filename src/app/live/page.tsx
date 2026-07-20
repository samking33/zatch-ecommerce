import Link from "next/link";
import { Users, ArrowUpRight } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { type OrbTone } from "@/components/ui/product-orb";
import { ProductMedia } from "@/components/ui/product-media";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { compact } from "@/lib/utils";

export const metadata = { title: "Live now" };

const tones: OrbTone[] = ["coral", "cobalt", "violet", "lime", "slate"];

export default async function LivePage() {
  const sessions = (await catalog.liveSessions(await serverToken())) ?? [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="On air"
        title="Sellers live right now"
        sub="Jump into a stream, drop your offer in the chat, and close the deal before it ends."
      />
      {sessions.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="live-dot grid h-3 w-3 place-items-center rounded-full bg-live" />
          <h2 className="mt-5 font-display text-2xl font-semibold text-ink">No one&apos;s live right now</h2>
          <p className="mt-2 text-muted">Browse Bits or the shop while you wait for the next drop.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/bits" className="pill-lime rounded-full px-6 py-3 text-sm font-semibold">Watch Bits</Link>
            <Link href="/shop" className="rounded-full border border-hairline px-6 py-3 text-sm font-medium text-ink hover:bg-surface-2">Shop now</Link>
          </div>
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((s, i) => (
          <Link
            key={`${s._id}-${i}`}
            href={`/live/${s.channelName}`}
            className="card card-hover group relative flex flex-col overflow-hidden rounded-[1.75rem] p-3"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
              <ProductMedia
                src={s.thumbnail?.url}
                alt={s.title}
                tone={tones[i % tones.length]}
                sizes="(max-width: 640px) 100vw, 33vw"
                className="h-full w-full"
              />
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
      )}
    </PageShell>
  );
}
