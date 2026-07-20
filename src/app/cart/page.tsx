"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, X, Tag, ArrowRight } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { ProductOrb, type OrbTone } from "@/components/ui/product-orb";
import { inr } from "@/lib/utils";

type Line = {
  id: string;
  name: string;
  variant: string;
  price: number;
  qty: number;
  tone: OrbTone;
  bargained?: boolean;
};

const initial: Line[] = [
  { id: "p1", name: "Aurora Over-Ear Headphone", variant: "Cobalt", price: 6490, qty: 1, tone: "cobalt", bargained: true },
  { id: "p2", name: "X-Bud Pro Wireless", variant: "White", price: 3299, qty: 2, tone: "slate" },
];

export default function CartPage() {
  const [lines, setLines] = useState<Line[]>(initial);

  const setQty = (id: string, d: number) =>
    setLines((ls) =>
      ls.map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty + d) } : l)),
    );
  const remove = (id: string) =>
    setLines((ls) => ls.filter((l) => l.id !== id));

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = subtotal > 4999 ? 0 : 79;
  const total = subtotal + shipping;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        <div className="px-1 py-8">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-ink">
            Your cart
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            {lines.length} item{lines.length !== 1 && "s"} · bargained prices locked
            for 24h
          </p>
        </div>

        {lines.length === 0 ? (
          <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
            <p className="font-display text-2xl font-semibold text-ink">
              Nothing here yet
            </p>
            <p className="mt-2 text-muted">Go strike a deal.</p>
            <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col gap-4">
              {lines.map((l) => (
                <div key={l.id} className="card flex items-center gap-4 rounded-[1.5rem] p-3">
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-surface-2 p-1">
                    <ProductOrb tone={l.tone} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">
                        {l.name}
                      </p>
                      <button
                        onClick={() => remove(l.id)}
                        aria-label="Remove item"
                        className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-muted">{l.variant}</p>
                    {l.bargained && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-lime px-2 py-0.5 text-[11px] font-semibold text-lime-ink">
                        <Tag className="h-3 w-3" /> Bargained
                      </span>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1 rounded-full border border-hairline p-1">
                        <button onClick={() => setQty(l.id, -1)} aria-label="Decrease" className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-2">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                        <button onClick={() => setQty(l.id, 1)} aria-label="Increase" className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-2">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="font-display text-lg font-semibold text-ink">
                        {inr(l.price * l.qty)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-28">
              <h2 className="font-display text-lg font-semibold text-ink">Summary</h2>
              <dl className="mt-4 space-y-3 text-[15px]">
                <Row label="Subtotal" value={inr(subtotal)} />
                <Row label="Shipping" value={shipping === 0 ? "Free" : inr(shipping)} />
                <div className="border-t border-hairline pt-3">
                  <Row label="Total" value={inr(total)} strong />
                </div>
              </dl>
              <Link
                href="/checkout"
                className="pill-lime mt-5 flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold"
              >
                Checkout <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-[13px] text-muted">
                Secure payment via Razorpay
              </p>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-display text-xl font-semibold text-ink" : "font-medium text-ink"}>
        {value}
      </dd>
    </div>
  );
}
