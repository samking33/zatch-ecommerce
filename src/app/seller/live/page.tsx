import Link from "next/link";
import { Radio, Calendar, X } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductMedia } from "@/components/ui/product-media";
import { ScheduleLive } from "@/components/seller/schedule-live";
import { LiveActions } from "@/components/seller/live-actions";
import { live as liveApi, products as productsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { compact, inr } from "@/lib/utils";

export const metadata = { title: "Seller · Live" };

// GET /live/dashboard: upcoming are live or queued; past ones carry their own totals.
type Upcoming = { _id: string; title?: string; status?: string; scheduledStartTime?: string; thumbnail?: { url?: string }; viewersCount?: number; queuePosition?: number; productsCount?: number };
type Past = { _id: string; title?: string; endTime?: string; thumbnail?: { url?: string }; views?: number; peak?: number; sales?: string; durationFormatted?: string; productsCount?: number };
type Dash = {
  performanceSummary?: { views?: number; revenue?: string; avgEngagement?: string; totalDurationFormatted?: string };
  upcomingLives?: Upcoming[];
  pastLives?: Past[];
};
type Overview = {
  _id: string;
  title?: string;
  statsSummary?: { views?: number; revenue?: number; avgEngagement?: number; totalOrders?: number; addToCarts?: number; zatches?: number };
  products?: { _id: string; name: string; price: number; discountedPrice?: number; images?: { url?: string }[]; stock?: number }[];
};

const PERIODS = [
  { key: "", label: "This week", filter: undefined },
  { key: "month", label: "This month", filter: "This Month" },
  { key: "year", label: "This year", filter: "This Year" },
];
const when = (d?: string) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

export default async function SellerLivePage({ searchParams }: { searchParams: Promise<{ period?: string; past?: string }> }) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your live sessions" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { period: requested, past: pastId } = await searchParams;
  const period = PERIODS.find((p) => p.key && p.key === requested) ?? PERIODS[0];
  const href = (past?: string) => {
    const q = new URLSearchParams({ ...(period.key ? { period: period.key } : {}), ...(past ? { past } : {}) }).toString();
    return q ? `/seller/live?${q}` : "/seller/live";
  };

  const [dash, myProducts] = await Promise.all([
    liveApi.dashboard(t, period.filter) as Promise<Dash | null>,
    productsApi.myProducts(t),
  ]);
  const upcoming = dash?.upcomingLives ?? [];
  const past = dash?.pastLives ?? [];
  const perf = dash?.performanceSummary;
  const overview = past.some((p) => p._id === pastId) ? ((await liveApi.details(pastId!, t))?.sessionDetails as Overview | undefined) : undefined;

  return (
    <SellerShell>
      <SellerHeader title="Live" sub="Schedule drops and go live to sell in real time." action={<ScheduleLive myProducts={myProducts ?? []} />} />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {PERIODS.map((p) => (
          <Link key={p.key} href={p.key ? `/seller/live?period=${p.key}` : "/seller/live"} aria-current={p.key === period.key ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${p.key === period.key ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}>
            {p.label}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Views", compact(perf?.views ?? 0)],
          ["Revenue", perf?.revenue ?? "₹0"],
          ["Avg engagement", perf?.avgEngagement ?? "0%"],
          ["Live time", perf?.totalDurationFormatted ?? "0m"],
        ].map(([k, v]) => (
          <div key={k} className="card rounded-[1.25rem] p-4">
            <p className="font-display text-xl font-semibold text-ink">{v}</p>
            <p className="text-[12px] text-muted">{k}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 px-1 font-display text-xl font-semibold text-ink">Upcoming</h2>
      {upcoming.length === 0 ? (
        <div className="mt-3"><EmptyState title="No scheduled lives. Schedule one to get started." /></div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((s) => {
            const isLive = s.status === "live";
            return (
              <div key={s._id} className="card overflow-hidden rounded-[1.5rem] p-3">
                <Thumb src={s.thumbnail?.url} title={s.title} badge={isLive ? "Live" : "Scheduled"} icon={isLive ? Radio : Calendar}
                  corner={isLive ? `${compact(s.viewersCount ?? 0)} watching` : s.queuePosition ? `#${s.queuePosition} in queue` : undefined} />
                <div className="px-2 pt-3">
                  <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{s.title ?? "Untitled live"}</p>
                  <p className="mt-0.5 text-sm text-muted">{isLive ? "On air now" : when(s.scheduledStartTime)} · {s.productsCount ?? 0} products</p>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-3">
                  <Link href={`/seller/live/${s._id}`} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold">
                    <Radio className="h-3.5 w-3.5" /> {isLive ? "Open studio" : "Go live"}
                  </Link>
                  <LiveActions sessionId={s._id} status={s.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {overview && <PastOverview live={overview} closeHref={href()} />}

      <h2 className="mt-8 px-1 font-display text-xl font-semibold text-ink">Past streams</h2>
      {past.length === 0 ? (
        <div className="mt-3"><EmptyState title="Your past streams will show here." /></div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {past.map((s) => (
            <Link key={s._id} href={`${href(s._id)}#past-details`} className="card block overflow-hidden rounded-[1.5rem] p-3 transition-colors hover:bg-surface-2">
              <Thumb src={s.thumbnail?.url} title={s.title} badge="Ended" icon={Radio} corner={s.durationFormatted} />
              <div className="px-2 py-3">
                <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{s.title ?? "Untitled live"}</p>
                <p className="mt-0.5 text-sm text-muted">{when(s.endTime)}</p>
                <p className="mt-1 text-[13px] text-ink">
                  {compact(s.views ?? 0)} views · {compact(s.peak ?? 0)} peak · {s.sales ?? "₹0"} sales
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SellerShell>
  );
}

function Thumb({ src, title, badge, icon: Icon, corner }: { src?: string; title?: string; badge: string; icon: typeof Radio; corner?: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface-2">
      <ProductMedia src={src} alt={title ?? "Live"} tone="coral" sizes="33vw" className="h-full w-full" />
      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold uppercase text-white backdrop-blur">
        <Icon className="h-3 w-3" /> {badge}
      </span>
      {corner && <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur">{corner}</span>}
    </div>
  );
}

// The app's past-live overview: summary and products (its comments tab is switched off, and the server drops comments once a live ends).
function PastOverview({ live, closeHref }: { live: Overview; closeHref: string }) {
  const s = live.statsSummary ?? {};
  return (
    <section id="past-details" aria-label="Live overview" className="card mt-8 scroll-mt-24 rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">{live.title ?? "Live overview"}</h2>
        <Link href={closeHref} scroll={false} aria-label="Close overview" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Views", compact(s.views ?? 0)],
          ["Revenue", inr(s.revenue ?? 0)],
          ["Engagement", `${s.avgEngagement ?? 0}%`],
          ["Orders", String(s.totalOrders ?? 0)],
          ["Add to carts", String(s.addToCarts ?? 0)],
          ["Zatches", String(s.zatches ?? 0)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-2 py-2.5">
            <p className="text-[15px] font-semibold text-ink">{v}</p>
            <p className="text-[11px] text-muted">{k}</p>
          </div>
        ))}
      </div>
      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-widest text-muted">Products ({live.products?.length ?? 0})</h3>
      <ul className="mt-2 space-y-2">
        {(live.products ?? []).map((p) => (
          <li key={p._id} className="flex items-center gap-3 rounded-2xl border border-hairline p-2.5">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              <ProductMedia src={p.images?.[0]?.url} alt={p.name} sizes="48px" className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${p._id}`} className="line-clamp-1 text-[14px] font-medium text-ink hover:underline">{p.name}</Link>
              <p className="text-[12px] text-muted">
                Cost <span className="font-semibold text-ink">{inr(p.discountedPrice ?? p.price)}</span> · Stock <span className="font-semibold text-ink">{p.stock ?? 0} units</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
