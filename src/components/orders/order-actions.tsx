"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, FileText, XCircle } from "lucide-react";
import { orders as ordersApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

const CANCELLABLE = ["pending", "confirmed", "processing"];

export function OrderActions({ orderId, status }: { orderId: string; status?: string }) {
  const router = useRouter();
  const token = getToken();
  const [busy, setBusy] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const canCancel = !status || CANCELLABLE.includes(status.toLowerCase());
  const delivered = status?.toLowerCase() === "delivered";

  async function cancel() {
    if (!token) return;
    const reason = window.prompt("Reason for cancellation?") ?? "Changed my mind";
    setBusy("cancel");
    const res = await ordersApi.cancel(orderId, { reason }, token);
    setBusy(null);
    if (res) router.refresh();
    else setMsg("Couldn't cancel this order.");
  }

  async function submitReview() {
    if (!token) return;
    setBusy("review");
    const res = await ordersApi.review(orderId, { rating, comment }, token);
    setBusy(null);
    if (res) { setReviewing(false); setMsg("Thanks for the review!"); }
    else setMsg("Couldn't submit review.");
  }

  async function invoice() {
    if (!token) return;
    setBusy("invoice");
    await ordersApi.generateInvoice(orderId, token);
    setBusy(null);
    // Filenames are order-specific; open the orders API host directly.
    window.open(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/invoices/${orderId}.pdf`, "_blank");
  }

  return (
    <div className="card rounded-[1.75rem] p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={invoice} disabled={busy === "invoice"} className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-60">
          {busy === "invoice" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Invoice
        </button>
        {delivered && !reviewing && (
          <button onClick={() => setReviewing(true)} className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-2">
            <Star className="h-4 w-4" /> Write a review
          </button>
        )}
        {canCancel && (
          <button onClick={cancel} disabled={busy === "cancel"} className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-live transition-colors hover:bg-live/5 disabled:opacity-60">
            {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Cancel order
          </button>
        )}
      </div>

      {reviewing && (
        <div className="mt-4 rounded-2xl bg-surface-2 p-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-lime text-lime" : "text-hairline"}`} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was it?" rows={3} className="mt-3 w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
          <button onClick={submitReview} disabled={busy === "review"} className="pill-lime mt-3 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70">
            {busy === "review" && <Loader2 className="h-4 w-4 animate-spin" />} Submit review
          </button>
        </div>
      )}

      {msg && <p className="mt-3 text-sm font-medium text-ink">{msg}</p>}
    </div>
  );
}
