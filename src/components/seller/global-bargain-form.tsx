"use client";

import { useState } from "react";
import { Loader2, Check, Tag } from "lucide-react";
import { products as productsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

type Settings = { enabled?: boolean; autoAcceptDiscount?: number; maximumDiscount?: number };

/** Global bargain defaults → POST /product/global-bargain-settings.
 *  Applies to every listing that doesn't override them. */
export function GlobalBargainForm({ initial }: { initial?: Settings }) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [auto, setAuto] = useState(initial?.autoAcceptDiscount ?? 10);
  const [max, setMax] = useState(initial?.maximumDiscount ?? 30);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setState("saving");
    const res = await productsApi.setGlobalBargain(
      { enabled, autoAcceptDiscount: auto, maximumDiscount: max },
      t,
    );
    setState(res ? "saved" : "error");
  }

  return (
    <form onSubmit={save} className="card max-w-xl rounded-[1.75rem] p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-lime-ink"><Tag className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Default bargain rules</h2>
          <p className="text-sm text-muted">Buyers can negotiate within these limits.</p>
        </div>
      </div>

      <label className="mt-6 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3.5">
        <span className="text-[15px] font-medium text-ink">Allow bargaining</span>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          aria-pressed={enabled}
          className={`grid h-7 w-12 items-center rounded-full p-0.5 transition-colors ${enabled ? "bg-lime" : "bg-hairline"}`}
        >
          <span className={`h-6 w-6 rounded-full bg-surface shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </button>
      </label>

      {enabled && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Auto-accept discount %</span>
            <input type="number" min={0} max={100} value={auto} onChange={(e) => setAuto(Number(e.target.value))} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
            <span className="mt-1 block text-[12px] text-muted">Offers at or above this are accepted instantly.</span>
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Maximum discount %</span>
            <input type="number" min={0} max={100} value={max} onChange={(e) => setMax(Number(e.target.value))} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
            <span className="mt-1 block text-[12px] text-muted">Buyers can&apos;t offer below this floor.</span>
          </label>
        </div>
      )}

      <button type="submit" disabled={state === "saving"} className="pill-lime mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-70">
        {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : null}
        {state === "saved" ? "Saved" : state === "error" ? "Try again" : "Save settings"}
      </button>
    </form>
  );
}
