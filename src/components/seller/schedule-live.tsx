"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radio, Upload, ArrowRight, ArrowLeft, X } from "lucide-react";
import { getToken } from "@/lib/client-auth";
import type { Product } from "@/lib/types";

type Row = { productId: string; name: string; autoAcceptDiscount: number; maximumDiscount: number };

/** Real 3-step live wizard (liveController.scheduleLiveSessionStep):
 *  1 draft + products, 2 per-product bargain settings, 3 title/time → queued.
 *  Step 3 is what actually schedules it - steps 1-2 alone leave a hidden draft. */
export function ScheduleLive({ myProducts = [] }: { myProducts?: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Row[]>([]);
  const [f, setF] = useState({ title: "", description: "", scheduledStartTime: "" });
  const [goLiveNow, setGoLiveNow] = useState(false);
  const [thumb, setThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = () => getToken();

  async function post(body: FormData | Record<string, unknown>) {
    const isForm = body instanceof FormData;
    return fetch("/api/v1/live/schedule", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${t()}`,
        ...(isForm ? {} : { "Content-Type": "application/json" }),
      },
      body: isForm ? body : JSON.stringify(body),
    }).then((r) => r.json()).catch(() => null);
  }

  async function step1(e: React.FormEvent) {
    e.preventDefault();
    if (picked.length === 0) { setError("Pick at least one product to sell."); return; }
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append("step", "1");
    fd.append("title", f.title);
    fd.append("description", f.description);
    picked.forEach((p) => fd.append("products", p.productId));
    picked.forEach((p) => fd.append("productSequence", p.productId));
    if (f.scheduledStartTime) fd.append("scheduledStartTime", new Date(f.scheduledStartTime).toISOString());
    if (thumb) fd.append("thumbnail", thumb);
    const res = await post(fd);
    setBusy(false);
    if (res?.success) { setSessionId(res.sessionId ?? res.session?._id ?? null); setStep(2); }
    else setError(res?.message ?? "Couldn't create the session.");
  }

  async function step2() {
    setBusy(true); setError(null);
    const res = await post({
      step: "2",
      sessionId,
      products: picked.map((p) => ({
        productId: p.productId,
        autoAcceptDiscount: p.autoAcceptDiscount,
        maximumDiscount: p.maximumDiscount,
      })),
    });
    setBusy(false);
    if (res?.success) setStep(3); else setError(res?.message ?? "Couldn't save bargain settings.");
  }

  async function step3() {
    setBusy(true); setError(null);
    const res = await post({
      step: "3",
      sessionId,
      title: f.title,
      description: f.description,
      goLiveNow,
      ...(goLiveNow ? {} : { scheduledStartTime: new Date(f.scheduledStartTime).toISOString() }),
    });
    setBusy(false);
    if (res?.success) { reset(); router.refresh(); }
    else if (res?.suggestedTime) {
      setError(`${res.message ?? "That slot clashes with another live."} Next free: ${new Date(res.suggestedTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`);
    } else setError(res?.message ?? "Couldn't schedule.");
  }

  function reset() {
    setOpen(false); setStep(1); setSessionId(null); setPicked([]);
    setF({ title: "", description: "", scheduledStartTime: "" }); setThumb(null); setGoLiveNow(false);
  }

  function toggle(p: Product) {
    setPicked((list) =>
      list.some((x) => x.productId === p._id)
        ? list.filter((x) => x.productId !== p._id)
        : [...list, {
            productId: p._id, name: p.name,
            autoAcceptDiscount: p.bargainSettings?.autoAcceptDiscount ?? 10,
            maximumDiscount: p.bargainSettings?.maximumDiscount ?? 30,
          }],
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
        <Radio className="h-4 w-4" /> Schedule a live
      </button>
    );
  }

  return (
    <div className="card w-full max-w-lg rounded-[1.75rem] p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Schedule a live drop</h2>
        <button onClick={reset} aria-label="Close"><X className="h-4 w-4 text-muted" /></button>
      </div>

      <div className="mb-5 flex items-center gap-2">
        {["Details", "Bargains", "Schedule"].map((l, i) => (
          <div key={l} className="flex flex-1 items-center gap-2">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${i + 1 <= step ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
            <span className={`text-[13px] font-medium ${i + 1 === step ? "text-ink" : "text-muted"}`}>{l}</span>
            {i < 2 && <span className={`h-0.5 flex-1 rounded ${i + 1 < step ? "bg-lime" : "bg-hairline"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={step1} className="space-y-3">
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Title</span>
            <input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Description</span>
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-hairline bg-surface-2 px-4 py-3 text-sm text-muted hover:border-ink">
            <Upload className="h-4 w-4" /> {thumb ? thumb.name : "Thumbnail (optional)"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
          </label>

          <div>
            <p className="text-[12px] font-medium text-muted">Products to sell ({picked.length})</p>
            <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
              {myProducts.length === 0 && <p className="text-sm text-muted">List a product first.</p>}
              {myProducts.map((p) => {
                const on = picked.some((x) => x.productId === p._id);
                return (
                  <button key={p._id} type="button" onClick={() => toggle(p)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ${on ? "border-ink bg-ink text-surface" : "border-hairline bg-surface-2 text-ink hover:border-ink"}`}>
                    <span className="line-clamp-1 flex-1">{p.name}</span>
                    <span className={on ? "text-surface/70" : "text-muted"}>₹{p.discountedPrice ?? p.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <button type="submit" disabled={busy} className="pill-lime inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-[15px] text-muted">Set how far buyers can negotiate during this live.</p>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {picked.map((row, i) => (
              <div key={row.productId} className="rounded-xl bg-surface-2 p-3">
                <p className="line-clamp-1 text-[13px] font-medium text-ink">{row.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-muted">Auto-accept %</span>
                    <input type="number" min={0} max={100} value={row.autoAcceptDiscount}
                      onChange={(e) => setPicked((l) => l.map((x, j) => j === i ? { ...x, autoAcceptDiscount: Number(e.target.value) } : x))}
                      className="mt-0.5 h-9 w-full rounded-lg border border-hairline bg-surface px-2.5 text-[13px] text-ink focus:border-ink focus:outline-none" />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-muted">Max discount %</span>
                    <input type="number" min={0} max={100} value={row.maximumDiscount}
                      onChange={(e) => setPicked((l) => l.map((x, j) => j === i ? { ...x, maximumDiscount: Number(e.target.value) } : x))}
                      className="mt-0.5 h-9 w-full rounded-lg border border-hairline bg-surface px-2.5 text-[13px] text-ink focus:border-ink focus:outline-none" />
                  </label>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <div className="flex gap-3">
            <Back onClick={() => setStep(1)} />
            <button onClick={step2} disabled={busy} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
            <span className="text-[15px] font-medium text-ink">Go live now</span>
            <input type="checkbox" checked={goLiveNow} onChange={(e) => setGoLiveNow(e.target.checked)} className="h-4 w-4 accent-ink" />
          </label>
          {!goLiveNow && (
            <label className="block">
              <span className="text-[12px] font-medium text-muted">Start time</span>
              <input type="datetime-local" required value={f.scheduledStartTime} onChange={(e) => setF({ ...f, scheduledStartTime: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
              <span className="mt-1 block text-[12px] text-muted">Must be at least 2 minutes out and 30 minutes clear of your other lives.</span>
            </label>
          )}
          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <div className="flex gap-3">
            <Back onClick={() => setStep(2)} />
            <button onClick={step3} disabled={busy || (!goLiveNow && !f.scheduledStartTime)} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />} {goLiveNow ? "Go live" : "Schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink hover:bg-surface-2">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}
