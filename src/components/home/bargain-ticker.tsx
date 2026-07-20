"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { inr } from "@/lib/utils";

// Live-negotiation signature, driven by a REAL product's list + deal price.
type Step = { who: "list" | "buyer" | "seller" | "deal"; price: number; label: string };

const tone: Record<Step["who"], string> = {
  list: "text-muted",
  buyer: "text-ink",
  seller: "text-ink",
  deal: "text-lime-ink",
};

export function BargainTicker({
  productName,
  listPrice,
  dealPrice,
}: {
  productName: string;
  listPrice: number;
  dealPrice?: number;
}) {
  const deal = dealPrice && dealPrice < listPrice ? dealPrice : Math.round(listPrice * 0.85);
  const script = useMemo<Step[]>(() => {
    const buyerFirst = Math.round(deal * 0.9);
    const sellerCounter = Math.round((deal + listPrice) / 2);
    return [
      { who: "list", price: listPrice, label: "List price" },
      { who: "buyer", price: buyerFirst, label: "You offered" },
      { who: "seller", price: sellerCounter, label: "Seller countered" },
      { who: "buyer", price: Math.round((buyerFirst + deal) / 2), label: "You countered" },
      { who: "deal", price: deal, label: "Deal locked" },
    ];
  }, [listPrice, deal]);

  const [i, setI] = useState(0);
  const step = script[i];
  const off = Math.round((1 - deal / listPrice) * 100);

  useEffect(() => {
    const ms = step.who === "deal" ? 2600 : 1700;
    const t = setTimeout(() => setI((n) => (n + 1) % script.length), ms);
    return () => clearTimeout(t);
  }, [i, step.who, script.length]);

  return (
    <div className="card w-[15.5rem] rounded-[1.25rem] p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="live-dot grid h-2.5 w-2.5 place-items-center rounded-full bg-live" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
          Live bargain
        </span>
        <span className="ml-auto max-w-[6rem] truncate text-[11px] text-muted">{productName}</span>
      </div>

      <div
        className={`mt-3 rounded-2xl px-4 py-3 transition-colors ${
          step.who === "deal" ? "bg-lime" : "bg-surface-2"
        }`}
      >
        <p className={`text-[11px] font-medium ${tone[step.who]} opacity-70`}>{step.label}</p>
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
          {step.who === "deal" && off > 0 && (
            <span className="text-[11px] font-semibold text-lime-ink/70">−{off}%</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        {script.map((_, n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${n <= i ? "bg-ink" : "bg-hairline"}`}
          />
        ))}
      </div>
    </div>
  );
}
