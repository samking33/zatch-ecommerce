import Link from "next/link";
import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { payments as paymentsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { inr } from "@/lib/utils";

export const metadata = { title: "Seller · Payouts" };

type Summary = { totalRevenueFormatted?: string; netRevenueFormatted?: string; pendingFormatted?: string; lastPaymentDate?: string | null };
// Due / completed rows: totalRevenue is what the seller receives (after fees); orderId is the order number.
type Payout = { _id: string; orderId?: string; status?: string; totalRevenue?: number; totalFormatted?: string; paidAt?: string; daysLeft?: number | null; holdReason?: string | null };
// Failed payouts and cancelled orders. Only failed payouts have a payout page; a cancellation's _id is an order id.
type Adjustment = { _id: string; type?: string; orderId?: string; status?: string; refundFormatted?: string; reason?: string; failureReason?: string };

// Earnings are counted for one of these windows by the server (default: this week). Pending payout is all time.
const PERIODS = ["This Week", "This Month", "This Quarter", "This Year"];

export default async function SellerPayoutsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: requested } = await searchParams;
  const period = PERIODS.find((p) => p === requested) ?? PERIODS[0];
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your payouts" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const [summary, due, done, adjustments] = await Promise.all([
    paymentsApi.summary(t, period) as Promise<Summary | null>,
    paymentsApi.due(t) as Promise<Payout[] | null>,
    paymentsApi.done(t) as Promise<Payout[] | null>,
    paymentsApi.adjustments(t) as Promise<Adjustment[] | null>,
  ]);

  const kpis = [
    { icon: Wallet, label: "Total revenue", value: summary?.totalRevenueFormatted ?? "₹0" },
    { icon: CheckCircle2, label: "Net (after fees)", value: summary?.netRevenueFormatted ?? "₹0" },
    { icon: Clock, label: "Pending payout", value: summary?.pendingFormatted ?? "₹0" },
  ];

  return (
    <SellerShell>
      <SellerHeader title="Payouts" sub="Track what you've earned and what's on the way to your bank." />

      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted">Earnings</span>
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={p === PERIODS[0] ? "/seller/payouts" : `/seller/payouts?period=${encodeURIComponent(p)}`}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${p === period ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}
          >
            {p}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="card rounded-[1.5rem] p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-ink"><k.icon className="h-5 w-5" /></span>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{k.value}</p>
            <p className="text-[13px] text-muted">{k.label}</p>
          </div>
        ))}
      </div>

      <PayoutList title="Due" payouts={due ?? []} empty="No pending payouts." />
      <PayoutList title="Completed" payouts={done ?? []} empty="No completed payouts yet." />
      {(adjustments ?? []).length > 0 && <AdjustmentList adjustments={adjustments ?? []} />}
    </SellerShell>
  );
}

function PayoutList({ title, payouts, empty }: { title: string; payouts: Payout[]; empty: string }) {
  return (
    <div className="mt-8">
      <h2 className="px-1 font-display text-xl font-semibold text-ink">{title}</h2>
      {payouts.length === 0 ? (
        <div className="mt-3"><EmptyState title={empty} /></div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {payouts.map((p) => (
            <Link key={p._id} href={`/seller/payouts/${p._id}`} className="card card-hover flex items-center justify-between rounded-[1.5rem] p-5">
              <div>
                <p className="font-display text-[15px] font-semibold text-ink">{p.totalFormatted ?? inr(p.totalRevenue ?? 0)}</p>
                <p className="text-sm text-muted">
                  {p.orderId ? `Order ${String(p.orderId).slice(-6)}` : title}
                  {p.daysLeft != null ? ` · due in ${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}` : ""}
                  {p.paidAt ? ` · paid ${new Date(p.paidAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}
                </p>
                {p.holdReason && <p className="mt-0.5 text-[13px] font-medium text-live">{p.holdReason}</p>}
              </div>
              <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-medium capitalize text-ink">{p.status ?? title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AdjustmentList({ adjustments }: { adjustments: Adjustment[] }) {
  return (
    <div className="mt-8">
      <h2 className="px-1 font-display text-xl font-semibold text-ink">Adjustments</h2>
      <div className="mt-3 flex flex-col gap-3">
        {adjustments.map((a) => {
          const body = (
            <>
              <div>
                <p className="font-display text-[15px] font-semibold text-ink">{a.refundFormatted ?? "₹0"}</p>
                <p className="text-sm text-muted">
                  {a.type === "failed_payout" ? "Failed payout" : "Cancelled order"}
                  {a.orderId ? ` · Order ${String(a.orderId).slice(-6)}` : ""}
                </p>
                {(a.failureReason ?? a.reason) && <p className="mt-0.5 text-[13px] text-muted">{a.failureReason ?? a.reason}</p>}
              </div>
              <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-medium capitalize text-ink">{a.status}</span>
            </>
          );
          const cls = "card flex items-center justify-between rounded-[1.5rem] p-5";
          return a.type === "failed_payout"
            ? <Link key={a._id} href={`/seller/payouts/${a._id}`} className={`${cls} card-hover`}>{body}</Link>
            : <div key={a._id} className={cls}>{body}</div>;
        })}
      </div>
    </div>
  );
}
