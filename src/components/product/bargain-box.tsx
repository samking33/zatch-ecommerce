"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Check, RotateCcw } from "lucide-react";
import { bargains as bargainsApi, cart as cartApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { inr } from "@/lib/utils";

type Phase = "idle" | "waiting" | "countered" | "accepted";

/**
 * Real "make an offer": POST /bargains/create with the buyer's price. The
 * backend auto-accepts, counters, or holds based on the seller's thresholds,
 * and we render whatever it returns. No simulation.
 */
export function BargainBox({
  productId,
  listPrice,
  color,
  size,
  autoAcceptDiscount = 10,
  maxDiscount = 30,
}: {
  productId: string;
  listPrice: number;
  color?: string;
  size?: string;
  autoAcceptDiscount?: number;
  maxDiscount?: number;
}) {
  const router = useRouter();
  const floor = Math.round(listPrice * (1 - maxDiscount / 100));
  const start = Math.round(listPrice * (1 - autoAcceptDiscount / 100));
  const [offer, setOffer] = useState(start);
  const [phase, setPhase] = useState<Phase>("idle");
  const [counter, setCounter] = useState(0);
  const [bargainId, setBargainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pct = useMemo(() => Math.round((1 - offer / listPrice) * 100), [offer, listPrice]);

  async function submit() {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setPhase("waiting");
    setError(null);
    const res = (await bargainsApi.create(
      {
        productId,
        offeredPrice: offer,
        variant: color || size ? { color, size } : undefined,
        quantity: 1,
      },
      token,
    )) as
      | { _id?: string; status?: string; counterOffer?: { price?: number }; currentPrice?: number }
      | null;

    if (!res) {
      setPhase("idle");
      setError("Couldn't send your offer. Try again.");
      return;
    }
    setBargainId(res._id ?? null);
    const status = res.status;
    if (status === "accepted" || status === "auto_accepted") {
      setPhase("accepted");
    } else if (status === "countered" && res.counterOffer?.price) {
      setCounter(res.counterOffer.price);
      setPhase("countered");
    } else {
      // pending — seller will respond; treat as sent
      setCounter(res.counterOffer?.price ?? res.currentPrice ?? offer);
      setPhase(res.counterOffer?.price ? "countered" : "accepted");
    }
  }

  async function acceptAndCart() {
    const token = getToken();
    if (!token || !bargainId) {
      router.push("/cart");
      return;
    }
    await bargainsApi.acceptCounter(bargainId, token);
    await cartApi.addBargain(bargainId, token);
    router.push("/cart");
  }

  function reset() {
    setPhase("idle");
    setOffer(start);
    setError(null);
  }

  return (
    <div className="card rounded-[1.5rem] p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-lime text-lime-ink">
          <Tag className="h-3.5 w-3.5" />
        </span>
        <p className="font-display text-[15px] font-semibold text-ink">Make an offer</p>
        <span className="ml-auto text-[13px] text-muted">Seller replies live</span>
      </div>

      <AnimatePresence mode="wait">
        {phase === "accepted" ? (
          <motion.div key="accepted" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-lime p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-lime-ink">
              <Check className="h-4 w-4" /> Offer sent{bargainId ? " · seller notified" : ""}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-lime-ink">
              {inr(offer)} <span className="text-sm font-medium">· {pct}% off</span>
            </p>
            <button onClick={acceptAndCart} className="btn-ink mt-3 w-full rounded-full py-3 text-sm font-semibold">
              Add to cart at this price
            </button>
          </motion.div>
        ) : phase === "countered" ? (
          <motion.div key="countered" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-surface-2 p-4">
            <p className="text-[13px] text-muted">Seller countered at</p>
            <p className="mt-0.5 font-display text-2xl font-semibold text-ink">{inr(counter)}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={acceptAndCart} className="pill-lime flex-1 rounded-full py-3 text-sm font-semibold">
                Accept {inr(counter)}
              </button>
              <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface">
                <RotateCcw className="h-3.5 w-3.5" /> Re-offer
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-3xl font-semibold tabular-nums text-ink">{inr(offer)}</span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[13px] font-medium text-ink">{pct}% off</span>
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
            {error && <p className="mt-2 text-sm font-medium text-live">{error}</p>}
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
