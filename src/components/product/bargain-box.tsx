"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Check, RotateCcw } from "lucide-react";
import { inr } from "@/lib/utils";

type Phase = "idle" | "waiting" | "countered" | "accepted";

/**
 * Interactive "make an offer" widget. Mirrors the backend bargain flow
 * (POST /bargains/create → seller accepts / counters). Until auth + sockets
 * are wired, it simulates the seller using the same auto-accept / max-discount
 * thresholds the backend uses, so the interaction is honest and demoable.
 */
export function BargainBox({
  listPrice,
  autoAcceptDiscount = 20,
  maxDiscount = 30,
}: {
  listPrice: number;
  autoAcceptDiscount?: number;
  maxDiscount?: number;
}) {
  const floor = Math.round(listPrice * (1 - maxDiscount / 100));
  const autoAccept = Math.round(listPrice * (1 - autoAcceptDiscount / 100));
  const [offer, setOffer] = useState(autoAccept);
  const [phase, setPhase] = useState<Phase>("idle");
  const [counter, setCounter] = useState(0);

  const pct = useMemo(
    () => Math.round((1 - offer / listPrice) * 100),
    [offer, listPrice],
  );

  function submit() {
    setPhase("waiting");
    setTimeout(() => {
      if (offer >= autoAccept) {
        setPhase("accepted");
      } else if (offer >= floor) {
        // seller meets in the middle
        setCounter(Math.round((offer + autoAccept) / 2));
        setPhase("countered");
      } else {
        setCounter(floor);
        setPhase("countered");
      }
    }, 1100);
  }

  function reset() {
    setPhase("idle");
    setOffer(autoAccept);
  }

  return (
    <div className="card rounded-[1.5rem] p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-lime text-lime-ink">
          <Tag className="h-3.5 w-3.5" />
        </span>
        <p className="font-display text-[15px] font-semibold text-ink">
          Make an offer
        </p>
        <span className="ml-auto text-[13px] text-muted">
          Seller replies live
        </span>
      </div>

      <AnimatePresence mode="wait">
        {phase === "accepted" ? (
          <motion.div
            key="accepted"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-lime p-4"
          >
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-lime-ink">
              <Check className="h-4 w-4" /> Offer accepted
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-lime-ink">
              {inr(offer)} <span className="text-sm font-medium">· {pct}% off</span>
            </p>
            <button className="btn-ink mt-3 w-full rounded-full py-3 text-sm font-semibold">
              Add to cart at this price
            </button>
          </motion.div>
        ) : phase === "countered" ? (
          <motion.div
            key="countered"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-surface-2 p-4"
          >
            <p className="text-[13px] text-muted">Seller countered at</p>
            <p className="mt-0.5 font-display text-2xl font-semibold text-ink">
              {inr(counter)}
            </p>
            <div className="mt-3 flex gap-2">
              <button className="pill-lime flex-1 rounded-full py-3 text-sm font-semibold">
                Accept {inr(counter)}
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Re-offer
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-3xl font-semibold tabular-nums text-ink">
                {inr(offer)}
              </span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[13px] font-medium text-ink">
                {pct}% off
              </span>
            </div>
            <input
              type="range"
              min={floor}
              max={listPrice}
              step={10}
              value={offer}
              onChange={(e) => setOffer(Number(e.target.value))}
              aria-label="Your offer price"
              className="mt-3 w-full accent-lime-deep"
            />
            <div className="flex justify-between text-[12px] text-muted">
              <span>Floor {inr(floor)}</span>
              <span>List {inr(listPrice)}</span>
            </div>
            <button
              onClick={submit}
              disabled={phase === "waiting"}
              className="pill-lime mt-4 w-full rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70"
            >
              {phase === "waiting" ? "Sending to seller…" : `Offer ${inr(offer)}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
