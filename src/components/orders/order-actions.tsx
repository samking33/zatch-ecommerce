"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star, Loader2, FileText, XCircle, MapPin, Phone, Eye, Undo2, RotateCcw, type LucideIcon,
} from "lucide-react";
import { orders as ordersApi, apiError } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { buyHref, type BuyItem } from "@/lib/checkout-link";

export type ServerAction = {
  action: string;
  label: string;
  type?: "primary" | "secondary" | "danger";
  icon?: string;
  requiresInput?: boolean;
};

// The backend sends Material icon names; map them to our icon set.
const ICON: Record<string, LucideIcon> = {
  cancel: XCircle,
  visibility: Eye,
  phone: Phone,
  location_on: MapPin,
  download: FileText,
  star: Star,
  undo: Undo2,
};

const STYLE: Record<string, string> = {
  primary: "pill-lime",
  danger: "border border-hairline text-live hover:bg-live/5",
  secondary: "border border-hairline text-ink hover:bg-surface-2",
};

/** Renders exactly the actions the server says are valid for this order and
 *  role - same contract the mobile app uses (orderController:getAvailableActions). */
export function OrderActions({
  orderId,
  actions,
  sellerId,
  tracking,
  buyAgain,
}: {
  orderId: string;
  actions?: ServerAction[];
  sellerId?: string;
  tracking?: { awb?: string; courier?: string; isAvailable?: boolean };
  /** Items to buy again; the app offers this once an order is delivered or cancelled. */
  buyAgain?: BuyItem[];
}) {
  const router = useRouter();
  const token = getToken();
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [showTracking, setShowTracking] = useState(false);

  const list = actions?.length ? actions : [{ action: "view_details", label: "View details", type: "secondary" as const, icon: "visibility" }];

  async function run(a: ServerAction) {
    if (!token) return;
    switch (a.action) {
      case "cancel": {
        const reason = window.prompt("Reason for cancellation?");
        if (reason === null) return;
        setBusy(a.action);
        setMsg(null);
        const res = await ordersApi.cancel(orderId, { reason: reason || "Changed my mind" }, token);
        setBusy(null);
        const failure = apiError(res, "Couldn't cancel this order.");
        if (failure) setMsg(failure); else router.refresh();
        return;
      }
      case "download_invoice": {
        setBusy(a.action);
        setMsg(null);
        const res = await ordersApi.generateInvoice(orderId, token);
        setBusy(null);
        const url = res?.invoice?.buyerUrl;
        if (url) window.open(url, "_blank", "noopener");
        else setMsg(apiError(res, "Invoice isn't ready yet.") ?? "Invoice isn't ready yet.");
        return;
      }
      case "review":
        setReviewing((v) => !v);
        return;
      case "track_order":
        setShowTracking((v) => !v);
        return;
      case "contact_seller":
        router.push(sellerId ? `/seller/${sellerId}` : "/support");
        return;
      default:
        return; // view_details - already here
    }
  }

  async function submitReview() {
    if (!token) return;
    setBusy("review");
    const res = await ordersApi.review(orderId, { rating, comment }, token);
    setBusy(null);
    const failure = apiError(res, "Couldn't submit your review. Try again.");
    if (failure) setMsg(failure);
    else { setReviewing(false); setMsg("Thanks for the review!"); }
  }

  return (
    <div className="card rounded-[1.75rem] p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Actions</h2>

      <div className="mt-4 flex flex-wrap gap-3">
        {list.map((a) => {
          const Icon = ICON[a.icon ?? ""] ?? Eye;
          // Returns aren't offered yet (no buyer return endpoint; the app says all sales are final).
          if (a.action === "view_details" || a.action === "return") return null;
          return (
            <button
              key={a.action}
              onClick={() => run(a)}
              disabled={busy === a.action}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${STYLE[a.type ?? "secondary"]}`}
            >
              {busy === a.action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {a.label}
            </button>
          );
        })}
        {!!buyAgain?.length && (
          <button
            onClick={() => router.push(buyHref(buyAgain))}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${STYLE.secondary}`}
          >
            <RotateCcw className="h-4 w-4" /> Buy again
          </button>
        )}
      </div>

      {showTracking && (
        <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-[15px]">
          {tracking?.awb ? (
            <>
              <p className="text-ink"><span className="text-muted">Courier:</span> {tracking.courier ?? "-"}</p>
              <p className="mt-1 text-ink"><span className="text-muted">AWB:</span> {tracking.awb}</p>
            </>
          ) : (
            <p className="text-muted">Tracking details aren&apos;t available yet.</p>
          )}
        </div>
      )}

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
      <p className="mt-3 text-[13px] text-muted">
        Need help? <Link href="/support" className="font-medium text-ink hover:underline">Contact support</Link>
      </p>
    </div>
  );
}
