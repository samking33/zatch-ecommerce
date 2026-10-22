"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw, Loader2 } from "lucide-react";
import { bargains as bargainsApi, apiError } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { inr } from "@/lib/utils";

/** The app's Approve / Counter / Reject for one active zatch.
 *  `requested` is the buyer's first offer, `current` the price now on the table (their counter, if any). */
export function BargainRespond({ bargainId, requested, current, list }: { bargainId: string; requested: number; current: number; list: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<"counter" | "reject" | null>(null);
  const [counter, setCounter] = useState(String(Math.round((current + list) / 2)));
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);

  async function run(kind: string, call: (t: string) => Promise<unknown>, done: string) {
    const t = getToken();
    if (!t) return;
    setBusy(kind);
    setErr(null);
    const res = await call(t);
    setBusy(null);
    const failure = apiError(res, "Couldn't send your reply. Try again.");
    if (failure) return setErr(failure);
    setResolved(done);
    setMode(null);
    router.refresh();
  }

  function sendCounter(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(counter);
    // The server's rule: above the buyer's first offer and below the list price.
    if (!(price > requested && price < list)) return setErr(`Enter a price between ${inr(requested)} and ${inr(list)}.`);
    run("counter", (t) => bargainsApi.counter(bargainId, { counterPrice: price, ...(message.trim() ? { message: message.trim() } : {}) }, t), `Countered at ${inr(price)}`);
  }

  if (resolved) return <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink">{resolved}</span>;

  const field = "h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm text-ink focus:border-ink focus:outline-none";
  return (
    <div className="w-full">
      {mode === null && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => run("accept", (t) => bargainsApi.accept(bargainId, t), `Approved at ${inr(current)}`)} disabled={!!busy}
            className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70">
            {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
          </button>
          <button onClick={() => { setMode("counter"); setErr(null); }} disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">
            <RotateCcw className="h-3.5 w-3.5" /> Counter
          </button>
          <button onClick={() => { setMode("reject"); setErr(null); }} disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-live hover:bg-live/5">
            <X className="h-3.5 w-3.5" /> Reject
          </button>
        </div>
      )}

      {mode === "counter" && (
        <form onSubmit={sendCounter} className="space-y-2 rounded-2xl bg-surface-2 p-3">
          <p className="text-[13px] text-muted">Propose a new price to the buyer.</p>
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Your counter price ₹</span>
            <input type="number" inputMode="numeric" value={counter} onChange={(e) => setCounter(e.target.value)} required autoFocus className={field} />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Message (optional)</span>
            <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} placeholder="Enter a short message" className={field} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode(null)} className="px-2 text-sm text-muted hover:text-ink">Cancel</button>
            <button disabled={!!busy} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70">
              {busy === "counter" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send counter
            </button>
          </div>
        </form>
      )}

      {mode === "reject" && (
        <form onSubmit={(e) => { e.preventDefault(); run("reject", (t) => bargainsApi.reject(bargainId, reason.trim() ? { sellerNote: reason.trim() } : {}, t), "Rejected"); }}
          className="space-y-2 rounded-2xl bg-surface-2 p-3">
          <p className="text-[13px] font-medium text-ink">Reject offer? This action cannot be undone.</p>
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Reason for rejection (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Enter reason" autoFocus className={field} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode(null)} className="px-2 text-sm text-muted hover:text-ink">Cancel</button>
            <button disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full bg-live px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy === "reject" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Reject
            </button>
          </div>
        </form>
      )}
      {err && <p role="alert" className="mt-2 text-[13px] font-medium text-live">{err}</p>}
    </div>
  );
}
