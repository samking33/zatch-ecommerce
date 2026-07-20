import Link from "next/link";
import { MapPin, CreditCard, Lock } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { inr } from "@/lib/utils";

export const metadata = { title: "Checkout" };

const lines = [
  ["Aurora Over-Ear Headphone", 6490],
  ["X-Bud Pro Wireless × 2", 6598],
] as const;

export default function CheckoutPage() {
  const subtotal = lines.reduce((s, [, v]) => s + v, 0);
  const total = subtotal;

  return (
    <PageShell>
      <div className="px-1 py-8">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-ink">
          Checkout
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          <section className="card rounded-[1.75rem] p-6 sm:p-7">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <MapPin className="h-5 w-5" /> Delivery address
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Full name" placeholder="Ryman Alex" />
              <Field label="Phone" placeholder="+91 98765 43210" />
              <Field label="Address" placeholder="Flat, street, area" full />
              <Field label="City" placeholder="Bengaluru" />
              <Field label="Pincode" placeholder="560001" />
            </div>
          </section>

          <section className="card rounded-[1.75rem] p-6 sm:p-7">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <CreditCard className="h-5 w-5" /> Payment
            </h2>
            <div className="mt-4 space-y-2.5">
              {["UPI", "Card", "Cash on delivery"].map((m, i) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-hairline bg-surface-2 px-4 py-3.5 has-[:checked]:border-ink"
                >
                  <input type="radio" name="pay" defaultChecked={i === 0} className="accent-ink" />
                  <span className="text-[15px] font-medium text-ink">{m}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-semibold text-ink">Order</h2>
          <dl className="mt-4 space-y-3 text-[15px]">
            {lines.map(([name, val]) => (
              <div key={name} className="flex justify-between gap-4">
                <dt className="min-w-0 flex-1 truncate text-muted">{name}</dt>
                <dd className="font-medium text-ink">{inr(val)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-hairline pt-3">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-display text-xl font-semibold text-ink">{inr(total)}</dd>
            </div>
          </dl>
          <button className="pill-lime mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold">
            <Lock className="h-4 w-4" /> Pay {inr(total)}
          </button>
          <Link href="/cart" className="mt-3 block text-center text-sm text-muted hover:text-ink">
            Back to cart
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}

function Field({ label, placeholder, full }: { label: string; placeholder: string; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <input
        placeholder={placeholder}
        className="mt-1.5 h-12 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
    </label>
  );
}
