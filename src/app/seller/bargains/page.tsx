import Link from "next/link";
import { Clock } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductMedia } from "@/components/ui/product-media";
import { BargainRespond } from "@/components/seller/bargain-respond";
import { RefreshOn } from "@/components/realtime/refresh-on";
import { bargains as bargainsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { inr, variantText } from "@/lib/utils";

export const metadata = { title: "Seller · Bargains" };

// GET /bargains/seller/dashboard, the app's zatches screen. Active is pending or buyer-countered and not yet expired.
type Zatch = {
  _id: string;
  productName?: string;
  productImage?: string;
  originalPrice?: number;
  requestedPrice?: number;
  currentPrice?: number;
  finalPrice?: number;
  quantity?: number;
  status?: string;
  statusLabel?: string;
  buyer?: { name?: string };
  variant?: { color?: string; size?: string } | null;
  buyerNote?: string;
  expiresIn?: string;
  orderPlaced?: boolean;
  completedAt?: string;
};
type Metric = { value?: string; change?: string; label?: string };
type Dash = {
  performanceReport?: { successRate?: Metric; avgDiscount?: Metric; revenue?: Metric };
  activeBargains?: Zatch[];
  historyBargains?: Zatch[];
};

const PERIODS = [
  { key: "", label: "This week", filter: undefined },
  { key: "month", label: "This month", filter: "This Month" },
  { key: "year", label: "This year", filter: "This Year" },
];

export default async function SellerBargainsPage({ searchParams }: { searchParams: Promise<{ period?: string; tab?: string }> }) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your bargains" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { period: requested, tab } = await searchParams;
  const period = PERIODS.find((p) => p.key && p.key === requested) ?? PERIODS[0];
  const history = tab === "history";
  const href = (o: { period?: string; tab?: string }) => {
    const q = new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
    return q ? `/seller/bargains?${q}` : "/seller/bargains";
  };

  const dash = (await bargainsApi.sellerDashboard(t, period.filter)) as Dash | null;
  const active = dash?.activeBargains ?? [];
  const past = dash?.historyBargains ?? [];
  const list = history ? past : active;
  const report = dash?.performanceReport;

  return (
    <SellerShell>
      <RefreshOn events={["new_bargain", "buyer_countered", "counter_accepted", "counter_rejected"]} />
      <SellerHeader title="Bargains" sub={`${active.length} offer${active.length !== 1 ? "s" : ""} awaiting your reply`} />

      {!dash ? (
        <EmptyState title="We couldn't load your bargains" sub="Refresh the page to try again." />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={href({ period: p.key, tab: history ? "history" : "" })}
                aria-current={p.key === period.key ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${p.key === period.key ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[report?.successRate, report?.avgDiscount, report?.revenue].map((m, i) => (
              <div key={i} className="card rounded-[1.25rem] p-4">
                <p className="font-display text-lg font-semibold text-ink sm:text-xl">{m?.value ?? "0"}</p>
                <p className="text-[12px] text-muted">{m?.label ?? ["Success Rate", "Avg Discount", "Revenue"][i]}</p>
                {m?.change && <p className={`mt-1 text-[11px] font-medium ${m.change.startsWith("-") ? "text-live" : "text-lime-deep"}`}>{m.change}</p>}
              </div>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted"><Clock className="h-3.5 w-3.5" /> Zatches will expire in 2 business days.</p>

          <div role="tablist" className="mb-3 mt-4 flex gap-1.5">
            {[
              { key: "", label: `Active (${active.length})` },
              { key: "history", label: `History (${past.length})` },
            ].map((x) => (
              <Link key={x.key} role="tab" aria-selected={(x.key === "history") === history} href={href({ period: period.key, tab: x.key })}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${(x.key === "history") === history ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}>
                {x.label}
              </Link>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState
              title={history ? "No zatch history yet" : "No offers waiting"}
              sub={history ? "Offers you've answered or that expired show up here." : "When buyers make offers, respond here in real time."}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {list.map((z) => <ZatchCard key={z._id} z={z} history={history} />)}
            </div>
          )}
        </>
      )}
    </SellerShell>
  );
}

function ZatchCard({ z, history }: { z: Zatch; history: boolean }) {
  const list = z.originalPrice ?? 0;
  const requested = z.requestedPrice ?? 0;
  const current = z.currentPrice ?? requested;
  const variant = variantText(" / ", z.variant?.color, z.variant?.size);
  const rows = [
    ["Buyer", z.buyer?.name ?? "Buyer"],
    variant && ["Variant", variant],
    ["Quantity", String(z.quantity ?? 1)],
    ["Requested price", <><span className="mr-1.5 text-muted line-through">{inr(list)}</span>{inr(requested)}</>],
    !history && z.status === "buyer_countered" && ["Buyer's counter", inr(current)],
    !history && ["Zatch expires in", z.expiresIn ?? "-"],
    history && ["Final price", inr(z.finalPrice ?? current)],
    // The server shifts this timestamp to IST but labels it UTC, so it is read back as UTC.
    history && z.completedAt && ["Updated", new Date(z.completedAt).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })],
  ].filter(Boolean) as [string, React.ReactNode][];

  return (
    <div className="card rounded-[1.5rem] p-4">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          <ProductMedia src={z.productImage} alt={z.productName ?? "Product"} sizes="56px" className="h-full w-full" />
        </div>
        <p className="line-clamp-2 min-w-0 flex-1 font-display text-[15px] font-semibold text-ink">{z.productName ?? "Product"}</p>
        <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-[12px] font-semibold text-ink">
          {z.orderPlaced ? "Order placed" : z.statusLabel ?? z.status}
        </span>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {z.buyerNote && <p className="mt-2 text-sm italic text-ink-soft">“{z.buyerNote}”</p>}
      {!history && (
        <div className="mt-3">
          <BargainRespond bargainId={z._id} requested={requested} current={current} list={list} />
        </div>
      )}
    </div>
  );
}
