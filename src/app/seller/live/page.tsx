import { Radio, Calendar } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { ScheduleLive } from "@/components/seller/schedule-live";
import { live as liveApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { compact } from "@/lib/utils";

export const metadata = { title: "Seller · Live" };

type Session = { _id: string; title?: string; status?: string; scheduledStartTime?: string; thumbnail?: { url?: string }; viewersCount?: number; peakViewers?: number };
type Dash = { upcomingLives?: Session[]; pastLives?: Session[]; performanceSummary?: { totalLives?: number; totalViews?: number } };

export default async function SellerLivePage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your live sessions" /></div></SellerShell>;

  const dash = (await liveApi.dashboard(t)) as Dash | null;
  const upcoming = dash?.upcomingLives ?? [];
  const past = dash?.pastLives ?? [];

  return (
    <SellerShell>
      <SellerHeader title="Live" sub="Schedule drops and go live to sell in real time." action={<ScheduleLive />} />

      <Group title="Upcoming" sessions={upcoming} empty="No scheduled lives. Schedule one to get started." icon={Calendar} />
      <Group title="Past streams" sessions={past} empty="Your past streams will show here." icon={Radio} />
    </SellerShell>
  );
}

function Group({ title, sessions, empty, icon: Icon }: { title: string; sessions: Session[]; empty: string; icon: typeof Radio }) {
  return (
    <div className="mt-8">
      <h2 className="px-1 font-display text-xl font-semibold text-ink">{title}</h2>
      {sessions.length === 0 ? (
        <div className="mt-3"><EmptyState title={empty} /></div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <div key={s._id} className="card overflow-hidden rounded-[1.5rem] p-3">
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface-2">
                <ProductMedia src={s.thumbnail?.url} alt={s.title ?? "Live"} tone="coral" sizes="33vw" className="h-full w-full" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold uppercase text-white backdrop-blur">
                  <Icon className="h-3 w-3" /> {s.status ?? title}
                </span>
              </div>
              <div className="px-2 py-3">
                <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{s.title ?? "Untitled live"}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {s.scheduledStartTime ? new Date(s.scheduledStartTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}
                  {s.peakViewers ? ` · ${compact(s.peakViewers)} peak` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
