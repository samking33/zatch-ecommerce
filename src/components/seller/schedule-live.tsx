"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radio, Upload } from "lucide-react";
import { getToken } from "@/lib/client-auth";

export function ScheduleLive() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", scheduledStartTime: "" });
  const [thumb, setThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const t = getToken();
    const fd = new FormData();
    fd.append("step", "1");
    fd.append("title", f.title);
    fd.append("description", f.description);
    if (f.scheduledStartTime) fd.append("scheduledStartTime", new Date(f.scheduledStartTime).toISOString());
    if (thumb) fd.append("thumbnail", thumb);
    const res = await fetch("/api/v1/live/schedule", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd })
      .then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.success) { setOpen(false); router.refresh(); }
    else setError(res?.message ?? "Couldn't schedule. Try again.");
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
        <Radio className="h-4 w-4" /> Schedule a live
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-lg rounded-[1.75rem] p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Schedule a live drop</h2>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[12px] font-medium text-muted">Title</span>
          <input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-[12px] font-medium text-muted">Description</span>
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-[12px] font-medium text-muted">Start time</span>
          <input type="datetime-local" value={f.scheduledStartTime} onChange={(e) => setF({ ...f, scheduledStartTime: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-hairline bg-surface-2 px-4 py-3 text-sm text-muted hover:border-ink">
          <Upload className="h-4 w-4" /> {thumb ? thumb.name : "Thumbnail (optional)"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-live">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink hover:bg-surface-2">Cancel</button>
        <button type="submit" disabled={busy} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />} Schedule
        </button>
      </div>
    </form>
  );
}
