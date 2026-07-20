import Link from "next/link";
import { Radio, Tag, Wallet, ArrowUpRight } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { ProductOrb } from "@/components/ui/product-orb";

export const metadata = { title: "Sell on Zatch" };

const perks = [
  { icon: Radio, title: "Go live in a tap", body: "Stream to buyers, demo products, and close deals in real time." },
  { icon: Tag, title: "Set your bargain rules", body: "Auto-accept thresholds and a price floor — you stay in control." },
  { icon: Wallet, title: "Fast payouts", body: "Track settlements and get paid to your bank on schedule." },
];

export default function SellPage() {
  return (
    <PageShell>
      <section className="card relative mt-6 overflow-hidden rounded-[2rem] p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-16 -top-10 h-72 w-72 opacity-80">
          <ProductOrb tone="lime" float />
        </div>
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium text-ink">
            <span className="live-dot h-2 w-2 rounded-full bg-live" /> For sellers
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.4rem,5vw,4rem)] font-semibold text-ink">
            Turn your feed into a live shop.
          </h1>
          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-muted">
            No website, no ads. Go live, post Bits, and let buyers negotiate.
            Zatch handles payments, delivery, and payouts.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/seller/register" className="pill-lime inline-flex items-center gap-3 rounded-full py-3.5 pl-6 pr-3.5 text-[15px] font-semibold">
              Become a seller
              <span className="btn-ink grid h-8 w-8 place-items-center rounded-full">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/seller/dashboard" className="rounded-full border border-hairline px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-surface-2">
              Seller dashboard
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {perks.map((p) => (
          <div key={p.title} className="card rounded-[1.75rem] p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-surface">
              <p.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-ink">{p.title}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
