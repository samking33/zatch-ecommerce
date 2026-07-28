import Link from "next/link";
import { Ticket } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { coupons as couponsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";

export const metadata = { title: "My coupons" };
export const dynamic = "force-dynamic";

type Coupon = {
  _id: string;
  code?: string;
  name?: string;
  discountType?: string;
  discountValue?: number;
  minSpend?: number;
  endDate?: string;
  isUsed?: boolean;
  alreadyUsed?: boolean;
  isExpired?: boolean;
  daysRemaining?: number;
};

export default async function MyCouponsPage() {
  const t = await serverToken();
  if (!t) {
    return <PageShell><div className="pt-6"><SignInRequired what="your coupons" /></div></PageShell>;
  }

  // /coupons/my-coupons currently 500s on the backend — degrade gracefully
  // rather than blowing up the page.
  const list = ((await couponsApi.myCoupons(t)) as Coupon[] | null) ?? [];

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="My coupons" sub="Discounts waiting to be used at checkout." />

      {list.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
            <Ticket className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">No coupons yet</h2>
          <p className="mt-2 text-muted">Seller coupons you collect will show up here.</p>
          <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Browse products</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div key={c._id} className={`card flex items-center gap-4 rounded-[1.5rem] p-5 ${c.isUsed || c.alreadyUsed || c.isExpired ? "opacity-60" : ""}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lime text-lime-ink">
                <Ticket className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-semibold text-ink">{c.code ?? c.name}</p>
                <p className="text-sm text-muted">
                  {c.discountType === "percentage" ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                  {c.minSpend ? ` · min ₹${c.minSpend}` : ""}
                </p>
                {c.endDate && (
                  <p className="mt-0.5 text-[12px] text-muted">
                    Expires {new Date(c.endDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                )}
              </div>
              {(c.isUsed || c.alreadyUsed) ? (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted">Used</span>
              ) : c.isExpired ? (
                <span className="rounded-full bg-live/10 px-2.5 py-1 text-[12px] font-medium text-live">Expired</span>
              ) : c.daysRemaining != null && c.daysRemaining <= 3 ? (
                <span className="rounded-full bg-live/10 px-2.5 py-1 text-[12px] font-medium text-live">
                  {c.daysRemaining}d left
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
