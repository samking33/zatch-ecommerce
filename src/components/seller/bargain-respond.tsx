"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw, Loader2 } from "lucide-react";
import { bargains as bargainsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { inr } from "@/lib/utils";

export function BargainRespond({ bargainId, offered, list }: { bargainId: string; offered: number; list: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [counter, setCounter] = useState(Math.round((offered + list) / 2));
  const [resolved, setResolved] = useState<string | null>(null);

  async function act(kind: "accept" | "reject") {
    const t = getToken();
    if (!t) return;
    setBusy(kind);
    const res = kind === "accept" ? await bargainsApi.accept(bargainId, t) : await bargainsApi.reject(bargainId, t);
    setBusy(null);
    if (res) { setResolved(kind === "accept" ? "Accepted" : "Rejected"); router.refresh(); }
  }

  async function sendCounter() {
    const t = getToken();
    if (!t) return;
    setBusy("counter");
    const res = await bargainsApi.counter(bargainId, { counterPrice: counter }, t);
    setBusy(null);
    if (res) { setResolved(`Countered at ${inr(counter)}`); setCountering(false); router.refresh(); }
  }

  if (resolved) return <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink">{resolved}</span>;

  if (countering) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border border-hairline bg-surface-2 pl-3">
          <span className="text-sm text-muted">₹</span>
          <input type="number" value={counter} onChange={(e) => setCounter(Number(e.target.value))} className="h-9 w-24 bg-transparent px-2 text-sm font-medium text-ink focus:outline-none" />
        </div>
        <button onClick={sendCounter} disabled={busy === "counter"} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70">
          {busy === "counter" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Send
        </button>
        <button onClick={() => setCountering(false)} className="text-sm text-muted hover:text-ink">Cancel</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => act("accept")} disabled={!!busy} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70">
        {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Accept
      </button>
      <button onClick={() => setCountering(true)} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">
        <RotateCcw className="h-3.5 w-3.5" /> Counter
      </button>
      <button onClick={() => act("reject")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-live hover:bg-live/5 disabled:opacity-70">
        {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
