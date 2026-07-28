"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw, Loader2, ShoppingBag } from "lucide-react";
import { bargains as bargainsApi, cart as cartApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { inr } from "@/lib/utils";

/** Buyer-side response to a seller's counter: accept, counter back, or reject.
 *  Mirrors the mobile app's bargain thread actions. */
export function BuyerBargainActions({
  bargainId,
  counterPrice,
  listPrice,
  floor,
}: {
  bargainId: string;
  counterPrice: number;
  listPrice: number;
  floor?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const min = floor ?? Math.round(listPrice * 0.5);
  const [offer, setOffer] = useState(Math.max(min, Math.round((counterPrice + min) / 2)));
  const [done, setDone] = useState<string | null>(null);

  function auth() {
    const t = getToken();
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function accept() {
    const t = auth(); if (!t) return;
    setBusy("accept");
    const ok = await bargainsApi.acceptCounter(bargainId, t);
    if (ok) await cartApi.addBargain(bargainId, t);
    setBusy(null);
    if (ok) { setDone("Accepted — added to cart"); router.refresh(); }
  }

  async function reject() {
    const t = auth(); if (!t) return;
    setBusy("reject");
    const ok = await bargainsApi.rejectCounter(bargainId, t);
    setBusy(null);
    if (ok) { setDone("Rejected"); router.refresh(); }
  }

  async function counter() {
    const t = auth(); if (!t) return;
    setBusy("counter");
    const ok = await bargainsApi.buyerCounter(bargainId, { counterPrice: offer }, t);
    setBusy(null);
    if (ok) { setDone(`Countered at ${inr(offer)}`); setCountering(false); router.refresh(); }
  }

  if (done) {
    return <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink">{done}</span>;
  }

  if (countering) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-full border border-hairline bg-surface-2 pl-3">
          <span className="text-sm text-muted">₹</span>
          <input
            type="number"
            min={min}
            max={counterPrice}
            value={offer}
            onChange={(e) => setOffer(Number(e.target.value))}
            className="h-9 w-24 bg-transparent px-2 text-sm font-medium text-ink focus:outline-none"
          />
        </div>
        <button onClick={counter} disabled={busy === "counter"} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70">
          {busy === "counter" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Send
        </button>
        <button onClick={() => setCountering(false)} className="text-sm text-muted hover:text-ink">Cancel</button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={accept} disabled={!!busy} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70">
        {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingBag className="h-3.5 w-3.5" />}
        Accept {inr(counterPrice)}
      </button>
      <button onClick={() => setCountering(true)} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">
        <RotateCcw className="h-3.5 w-3.5" /> Counter
      </button>
      <button onClick={reject} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-live hover:bg-live/5 disabled:opacity-70">
        {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export { Check };
