import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { SellerShell } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { payments as paymentsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { inr } from "@/lib/utils";

export const metadata = { title: "Seller · Payout" };
export const dynamic = "force-dynamic";

type Line = { label?: string; name?: string; amount?: number; orderId?: string; qty?: number };
type Payout = {
  _id?: string;
  payoutId?: string;
  amount?: number;
  netAmount?: number;
  commission?: number;
  tax?: number;
  status?: string;
  createdAt?: string;
  paidAt?: string;
  utr?: string;
  orders?: Line[];
  items?: Line[];
  breakdown?: Line[];
};

export default async function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="this payout" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const res = (await paymentsApi.payout(id, t)) as ({ payout?: Payout } & Payout) | null;
  const p = res?.payout ?? res;
  if (!p) notFound();

  const lines = p.orders ?? p.items ?? p.breakdown ?? [];

  return (
    <SellerShell>
      <Link href="/seller/payouts" className="inline-flex items-center gap-2 px-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Payouts
      </Link>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card rounded-[1.75rem] p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-surface"><Wallet className="h-5 w-5" /></span>
            <div>
              <p className="font-display text-2xl font-semibold text-ink">{inr(p.netAmount ?? p.amount ?? 0)}</p>
              <p className="text-sm capitalize text-muted">
                {p.status ?? "pending"}
                {p.paidAt ? ` · paid ${new Date(p.paidAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}
              </p>
            </div>
          </div>

          {lines.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-lg font-semibold text-ink">Included orders</h2>
              <div className="mt-3 flex flex-col gap-2">
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                    <span className="min-w-0 truncate text-[15px] text-ink">
                      {l.label ?? l.name ?? (l.orderId ? `Order ${String(l.orderId).slice(-6)}` : `Item ${i + 1}`)}
                    </span>
                    <span className="font-medium text-ink">{inr(l.amount ?? 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="card h-fit rounded-[1.75rem] p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Breakdown</h2>
          <dl className="mt-4 space-y-2.5 text-[15px]">
            <Row label="Gross" value={inr(p.amount ?? 0)} />
            {p.commission ? <Row label="Commission" value={`− ${inr(p.commission)}`} /> : null}
            {p.tax ? <Row label="Tax" value={`− ${inr(p.tax)}`} /> : null}
            <div className="border-t border-hairline pt-2.5">
              <Row label="Net payout" value={inr(p.netAmount ?? p.amount ?? 0)} strong />
            </div>
          </dl>
          {p.utr && <p className="mt-4 text-[13px] text-muted">UTR {p.utr}</p>}
          {(p.payoutId ?? p._id) && (
            <p className="mt-1 text-[13px] text-muted">Ref {p.payoutId ?? p._id}</p>
          )}
        </aside>
      </div>
    </SellerShell>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-display text-lg font-semibold text-ink" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}
