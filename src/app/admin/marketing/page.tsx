import Link from "next/link";
import { Wallet, TrendingUp, Target, ShoppingBag, PlugZap, TriangleAlert } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { getReports, roas, sumMetrics, PLATFORM_LABEL, PLATFORM_COLOR, type Metrics, type Report, type Campaign, type Platform } from "@/lib/marketing";
import { inr, compact } from "@/lib/utils";

export const metadata = { title: "Marketing" };
// Spend changes through the day and the range comes from the URL, so never cache.
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];

type Live = Extract<Report, { status: "ok" }>;
const isLive = (r: Report): r is Live => r.status === "ok";

function ratio(m: Metrics): string {
  const r = roas(m);
  return r === null ? "—" : `${r.toFixed(2)}×`;
}

/** One funnel per platform, so each is a single series and needs no colour legend. */
function Funnel({ m, color }: { m: Metrics; color: string }) {
  const steps = [
    { label: "Product views", value: m.viewContent },
    { label: "Add to cart", value: m.addToCart },
    { label: "Checkout", value: m.checkout },
    { label: "Purchases", value: m.purchases },
  ];
  const peak = Math.max(1, ...steps.map((s) => s.value));

  return (
    <ul className="mt-4 space-y-3" role="img" aria-label={steps.map((s) => `${s.label} ${s.value}`).join(", ")}>
      {steps.map((step, i) => {
        const before = i === 0 ? null : steps[i - 1].value;
        const kept = before && before > 0 ? (step.value / before) * 100 : null;
        return (
          <li key={step.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-ink-soft">{step.label}</span>
              <span className="font-display text-[15px] font-semibold tabular-nums text-ink">
                {compact(step.value)}
                {kept !== null && <span className="ml-2 text-[12px] font-normal text-muted">{kept.toFixed(0)}%</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-surface-2">
              <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (step.value / peak) * 100)}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PlatformCard({ report }: { report: Report }) {
  const label = PLATFORM_LABEL[report.platform];
  const color = PLATFORM_COLOR[report.platform];

  if (report.status !== "ok") {
    const off = report.status === "off";
    return (
      <div className="card rounded-[1.5rem] p-5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <p className="font-display text-lg font-semibold text-ink">{label}</p>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
          {off ? <PlugZap className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4 text-live" />}
          {off ? "Not connected" : "Couldn't load"}
        </p>
        <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{report.reason}</p>
      </div>
    );
  }

  const t = report.totals;
  return (
    <div className="card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <p className="font-display text-lg font-semibold text-ink">{label}</p>
        </div>
        <p className="text-[13px] text-muted">{compact(t.clicks)} clicks</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Spend", inr(t.spend)],
          ["Revenue", inr(t.revenue)],
          ["ROAS", ratio(t)],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="font-display text-[19px] font-semibold tabular-nums text-ink">{v}</p>
            <p className="text-[12px] text-muted">{k}</p>
          </div>
        ))}
      </div>

      {report.funnel ? (
        <Funnel m={t} color={color} />
      ) : (
        <p className="mt-4 border-t border-hairline pt-3 text-[13px] leading-snug text-muted">
          {compact(t.purchases)} conversions. Google reports one total rather than the
          per-step funnel, so only Meta is broken out above.
        </p>
      )}
    </div>
  );
}

function CampaignTable({ rows }: { rows: (Campaign & { platform: Platform })[] }) {
  return (
    <div className="card mt-4 overflow-hidden rounded-[1.5rem]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <caption className="sr-only">Campaign performance for the selected period</caption>
          <thead>
            <tr className="border-b border-hairline text-[12px] uppercase tracking-wide text-muted">
              <th scope="col" className="px-5 py-3 font-medium">Campaign</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Spend</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Clicks</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Purchases</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Revenue</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={`${c.platform}-${c.id}`} className="border-b border-hairline last:border-0">
                <th scope="row" className="px-5 py-3 font-normal">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: PLATFORM_COLOR[c.platform] }} />
                    <span className="text-[14px] font-medium text-ink">{c.name}</span>
                    <span className="sr-only">on {PLATFORM_LABEL[c.platform]}</span>
                  </span>
                </th>
                <td className="px-5 py-3 text-right text-[14px] tabular-nums text-ink-soft">{inr(c.spend)}</td>
                <td className="px-5 py-3 text-right text-[14px] tabular-nums text-ink-soft">{compact(c.clicks)}</td>
                <td className="px-5 py-3 text-right text-[14px] tabular-nums text-ink-soft">{compact(c.purchases)}</td>
                <td className="px-5 py-3 text-right text-[14px] tabular-nums text-ink-soft">{inr(c.revenue)}</td>
                <td className="px-5 py-3 text-right text-[14px] font-semibold tabular-nums text-ink">{ratio(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: asked } = await searchParams;
  const days = RANGES.includes(Number(asked)) ? Number(asked) : 30;

  const reports = await getReports(days);
  const live = reports.filter(isLive);
  const blended = sumMetrics(live.map((r) => r.totals));
  const campaigns = live
    .flatMap((r) => r.campaigns.map((c) => ({ ...c, platform: r.platform })))
    .filter((c) => c.spend > 0 || c.clicks > 0)
    .sort((a, b) => b.spend - a.spend);

  const kpis = [
    { icon: Wallet, label: "Ad spend", value: inr(blended.spend) },
    { icon: TrendingUp, label: "Revenue", value: inr(blended.revenue) },
    { icon: Target, label: "ROAS", value: ratio(blended) },
    { icon: ShoppingBag, label: "Purchases", value: compact(blended.purchases) },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin"
        title="Marketing"
        sub={live.length > 0 ? `Meta and Google together, last ${days} days.` : "Connect an ad account to see spend and return here."}
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted">Period</span>
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/admin/marketing?days=${r}`}
            aria-current={r === days ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${r === days ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}
          >
            {r} days
          </Link>
        ))}
      </div>

      {live.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="card rounded-[1.5rem] p-5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-ink"><k.icon className="h-[18px] w-[18px]" /></span>
              <p className="mt-3 font-display text-2xl font-semibold tabular-nums text-ink">{k.value}</p>
              <p className="text-[13px] text-muted">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {reports.map((r) => <PlatformCard key={r.platform} report={r} />)}
      </div>

      {campaigns.length > 0 && (
        <>
          <h2 className="mt-8 px-1 font-display text-xl font-semibold text-ink">Campaigns</h2>
          <CampaignTable rows={campaigns} />
        </>
      )}
    </PageShell>
  );
}
