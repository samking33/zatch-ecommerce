import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { payments as paymentsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { inr } from "@/lib/utils";

export const metadata = { title: "Seller · Payouts" };

type Summary = { totalRevenueFormatted?: string; netRevenueFormatted?: string; pendingFormatted?: string; lastPaymentDate?: string | null };
type Payout = { _id: string; amount?: number; status?: string; createdAt?: string; orderId?: string };

export default async function SellerPayoutsPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your payouts" /></div></SellerShell>;

  const [summary, due, done] = await Promise.all([
    paymentsApi.summary(t) as Promise<Summary | null>,
    paymentsApi.due(t) as Promise<Payout[] | null>,
    paymentsApi.done(t) as Promise<Payout[] | null>,
  ]);

  const kpis = [
    { icon: Wallet, label: "Total revenue", value: summary?.totalRevenueFormatted ?? "₹0" },
    { icon: CheckCircle2, label: "Net (after fees)", value: summary?.netRevenueFormatted ?? "₹0" },
    { icon: Clock, label: "Pending payout", value: summary?.pendingFormatted ?? "₹0" },
  ];

  return (
    <SellerShell>
      <SellerHeader title="Payouts" sub="Track what you've earned and what's on the way to your bank." />

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
            <div key={p._id} className="card flex items-center justify-between rounded-[1.5rem] p-5">
              <div>
                <p className="font-display text-[15px] font-semibold text-ink">{inr(p.amount ?? 0)}</p>
                <p className="text-sm capitalize text-muted">{p.status ?? title.toLowerCase()}{p.orderId ? ` · order ${String(p.orderId).slice(-6)}` : ""}</p>
              </div>
              <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-medium capitalize text-ink">{p.status ?? title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
