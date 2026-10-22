"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, RotateCcw, Loader2, ShoppingBag, Check, Zap } from "lucide-react";
import { bargains as bargainsApi, cart as cartApi, apiError } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { buyHref } from "@/lib/checkout-link";
import { inr } from "@/lib/utils";

type Item = { productId?: string; color?: string | null; size?: string | null; qty?: number };

/** Buyer-side response to a seller's counter: accept, counter back, or reject.
 *  Mirrors the mobile app's bargain thread actions; once accepted it offers Pay / Add to cart. */
export function BuyerBargainActions({
  bargainId,
  counterPrice,
  listPrice,
  floor,
  item,
}: {
  bargainId: string;
  counterPrice: number;
  listPrice: number;
  floor?: number;
  item?: Item;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const min = floor ?? Math.round(listPrice * 0.5);
  const [offer, setOffer] = useState(Math.max(min, Math.round((counterPrice + min) / 2)));
  const [done, setDone] = useState<"accepted" | "rejected" | "countered" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "accept" | "reject" | "counter") {
    const t = getToken();
    if (!t) { router.push("/login"); return; }
    setBusy(kind);
    setError(null);
    const res =
      kind === "accept" ? await bargainsApi.acceptCounter(bargainId, t)
      : kind === "reject" ? await bargainsApi.rejectCounter(bargainId, t)
      : await bargainsApi.buyerCounter(bargainId, { counterPrice: offer }, t);
    setBusy(null);
    const failure = apiError(res, "Couldn't send that. Try again.");
    if (failure) return setError(failure);
    setCountering(false);
    setDone(kind === "accept" ? "accepted" : kind === "reject" ? "rejected" : "countered");
    router.refresh();
  }

  if (done === "accepted") return <AcceptedBargainActions bargainId={bargainId} item={item} />;
  if (done) {
    return (
      <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink">
        {done === "rejected" ? "Rejected" : `Countered at ${inr(offer)}`}
      </span>
    );
  }

  return (
    <div>
      {countering ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-hairline bg-surface-2 pl-3">
            <span className="text-sm text-muted">₹</span>
            <input
              type="number"
              min={min}
              max={counterPrice}
              value={offer}
              onChange={(e) => setOffer(Number(e.target.value))}
              aria-label="Your counter offer"
              className="h-9 w-24 bg-transparent px-2 text-sm font-medium text-ink focus:outline-none"
            />
          </div>
          <button onClick={() => run("counter")} disabled={busy === "counter"} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70">
            {busy === "counter" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Send
          </button>
          <button onClick={() => setCountering(false)} className="text-sm text-muted hover:text-ink">Cancel</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => run("accept")} disabled={!!busy} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70">
            {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Accept {inr(counterPrice)}
          </button>
          <button onClick={() => setCountering(true)} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">
            <RotateCcw className="h-3.5 w-3.5" /> Counter
          </button>
          <button onClick={() => run("reject")} disabled={!!busy} aria-label="Reject the counter offer" className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-live hover:bg-live/5 disabled:opacity-70">
            {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-medium text-live">{error}</p>}
    </div>
  );
}

/** An accepted bargain: pay for it straight away, or put it in the cart at the agreed price (as in the app). */
export function AcceptedBargainActions({ bargainId, item }: { bargainId: string; item?: Item }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addToCart() {
    const t = getToken();
    if (!t) { router.push("/login"); return; }
    setBusy(true);
    setError(null);
    const res = await cartApi.addBargain(bargainId, t);
    setBusy(false);
    const failure = apiError(res, "Couldn't add it to your cart. Try again.");
    if (failure) setError(failure);
    else router.push("/cart");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {item?.productId && (
          <button
            onClick={() => router.push(buyHref([{ productId: item.productId!, variantColor: item.color ?? "", variantSize: item.size ?? "", qty: item.qty ?? 1, bargainId }]))}
            className="pill-lime inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            <Zap className="h-4 w-4" /> Pay now
          </button>
        )}
        <button onClick={addToCart} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-70">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />} Add to cart
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-live">{error}</p>}
    </div>
  );
}
