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

// Shape of GET /payments/payout/:id (sellerPaymentController.getSellerPayoutDetailController).
type Payout = {
  _id?: string;
  paymentId?: string;
  orderId?: string;
  status?: string;
  paidAt?: string;
  utrNumber?: string | null;
  payoutMode?: string | null;
  holdReason?: string | null;
  failureReason?: string | null;
  adminNote?: string | null;
  breakdown?: {
    tax?: number;
    grossFormatted?: string; feeFormatted?: string; taxFormatted?: string; netFormatted?: string;
  };
  payoutDestination?: { type?: string; upiId?: string | null; accountNumber?: string | null; bankName?: string | null } | null;
  items?: { name?: string; qty?: number; price?: number }[];
};

export default async function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="this payout" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const res = (await paymentsApi.payout(id, t)) as { payout?: Payout } | null;
  const p = res?.payout;
  if (!p) notFound();

  const items = p.items ?? [];
  const b = p.breakdown ?? {};
  const dest = p.payoutDestination;
  const destLabel = dest ? (dest.type === "upi" ? dest.upiId : dest.accountNumber ? `${dest.bankName ?? "Bank"} ••••${dest.accountNumber.slice(-4)}` : null) : null;

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
              <p className="font-display text-2xl font-semibold text-ink">{b.netFormatted ?? "₹0"}</p>
              <p className="text-sm capitalize text-muted">
                {p.status ?? "pending"}
                {p.orderId ? ` · Order ${String(p.orderId).slice(-6)}` : ""}
                {p.paidAt ? ` · paid ${new Date(p.paidAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-lg font-semibold text-ink">Items in this order</h2>
              <div className="mt-3 flex flex-col gap-2">
                {items.map((l, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                    <span className="min-w-0 truncate text-[15px] text-ink">{l.name ?? `Item ${i + 1}`}{l.qty ? ` × ${l.qty}` : ""}</span>
                    <span className="font-medium text-ink">{inr((l.price ?? 0) * (l.qty ?? 1))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="card h-fit rounded-[1.75rem] p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Breakdown</h2>
          <dl className="mt-4 space-y-2.5 text-[15px]">
            <Row label="Order total" value={b.grossFormatted ?? "₹0"} />
            <Row label="Platform fee" value={`− ${b.feeFormatted ?? "₹0"}`} />
            {b.tax ? <Row label="Tax" value={`− ${b.taxFormatted}`} /> : null}
            <div className="border-t border-hairline pt-2.5">
              <Row label="Net payout" value={b.netFormatted ?? "₹0"} strong />
            </div>
          </dl>
          {(p.holdReason || p.failureReason) && (
            <p className="mt-4 rounded-xl bg-live/10 px-3.5 py-2.5 text-[13px] font-medium text-live">
              {p.failureReason ?? p.holdReason}
            </p>
          )}
          {p.adminNote && <p className="mt-4 text-[13px] text-muted">{p.adminNote}</p>}
          {p.utrNumber && <p className="mt-4 text-[13px] text-muted">UTR {p.utrNumber}</p>}
          {destLabel && (
            <p className="mt-1 text-[13px] text-muted">
              To {destLabel}
              {p.payoutMode ? ` · ${p.payoutMode}` : ""}
            </p>
          )}
          {p.paymentId && <p className="mt-1 text-[13px] text-muted">Ref {p.paymentId}</p>}
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
