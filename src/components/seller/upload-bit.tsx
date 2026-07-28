"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Video, X, Plus } from "lucide-react";
import { getToken } from "@/lib/client-auth";
import type { Product } from "@/lib/types";

/** Real Bit upload → POST /bits/upload (multipart: video + thumbnail).
 *  Sellers can tag their own products so the Bit is shoppable. */
export function UploadBit({ myProducts }: { myProducts: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", hashtags: "" });
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [tagged, setTagged] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!video) { setError("Choose a video to upload."); return; }
    setBusy(true); setError(null);
    const t = getToken();
    const fd = new FormData();
    fd.append("title", f.title);
    fd.append("description", f.description);
    if (f.hashtags) fd.append("hashtags", f.hashtags);
    tagged.forEach((id) => fd.append("products", id));
    fd.append("video", video);
    if (thumb) fd.append("thumbnail", thumb);
    const res = await fetch("/api/v1/bits/upload", {
      method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd,
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.success) {
      setOpen(false); setVideo(null); setThumb(null); setTagged([]);
      setF({ title: "", description: "", hashtags: "" });
      router.refresh();
    } else setError(res?.message ?? "Upload failed. Try again.");
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
        <Plus className="h-4 w-4" /> Upload a Bit
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-lg rounded-[1.75rem] p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Upload a Bit</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4 text-muted" /></button>
      </div>

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
          <span className="text-[12px] font-medium text-muted">Hashtags</span>
          <input value={f.hashtags} onChange={(e) => setF({ ...f, hashtags: e.target.value })} placeholder="#saree #summer" className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />
        </label>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-hairline bg-surface-2 px-4 py-4 text-sm text-muted hover:border-ink">
          <Video className="h-5 w-5" /> {video ? video.name : "Choose video (required)"}
          <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-hairline bg-surface-2 px-4 py-3 text-sm text-muted hover:border-ink">
          <Upload className="h-4 w-4" /> {thumb ? thumb.name : "Thumbnail (optional)"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
        </label>

        {myProducts.length > 0 && (
          <div>
            <p className="text-[12px] font-medium text-muted">Tag products (shoppable)</p>
            <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
              {myProducts.map((p) => {
                const on = tagged.includes(p._id);
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setTagged(on ? tagged.filter((x) => x !== p._id) : [...tagged, p._id])}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ${on ? "border-ink bg-ink text-surface" : "border-hairline bg-surface-2 text-ink hover:border-ink"}`}
                  >
                    <span className="line-clamp-1 flex-1">{p.name}</span>
                    <span className={on ? "text-surface/70" : "text-muted"}>₹{p.discountedPrice ?? p.price}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-live">{error}</p>}
      <button type="submit" disabled={busy} className="pill-lime mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Uploading…" : "Publish Bit"}
      </button>
    </form>
  );
}
