"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { inr } from "@/lib/utils";

// The signature interaction: a live negotiation playing out. Buyer offers,
// seller counters, deal locks — the loop that makes Zatch Zatch.
type Step = { who: "list" | "buyer" | "seller" | "deal"; price: number; label: string };

const script: Step[] = [
  { who: "list", price: 8990, label: "List price" },
  { who: "buyer", price: 5500, label: "You offered" },
  { who: "seller", price: 6800, label: "Seller countered" },
  { who: "buyer", price: 6200, label: "You countered" },
  { who: "deal", price: 6490, label: "Deal locked" },
];

const tone: Record<Step["who"], string> = {
  list: "text-muted",
  buyer: "text-ink",
  seller: "text-ink",
  deal: "text-lime-ink",
};

export function BargainTicker() {
  const [i, setI] = useState(0);
  const step = script[i];

  useEffect(() => {
    const ms = step.who === "deal" ? 2600 : 1700;
    const t = setTimeout(() => setI((n) => (n + 1) % script.length), ms);
    return () => clearTimeout(t);
  }, [i, step.who]);

  return (
    <div className="card w-[15.5rem] rounded-[1.25rem] p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="live-dot grid h-2.5 w-2.5 place-items-center rounded-full bg-live" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
          Live bargain
        </span>
        <span className="ml-auto text-[11px] text-muted">Aurora</span>
      </div>

      <div
        className={`mt-3 rounded-2xl px-4 py-3 transition-colors ${
          step.who === "deal" ? "bg-lime" : "bg-surface-2"
        }`}
      >
        <p className={`text-[11px] font-medium ${tone[step.who]} opacity-70`}>
          {step.label}
        </p>
        <div className="flex items-baseline gap-2 overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={i}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={`font-display text-[1.7rem] font-semibold tabular-nums ${tone[step.who]}`}
            >
              {inr(step.price)}
            </motion.span>
          </AnimatePresence>
          {step.who === "deal" && (
            <span className="text-[11px] font-semibold text-lime-ink/70">
              −28%
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        {script.map((_, n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              n <= i ? "bg-ink" : "bg-hairline"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
