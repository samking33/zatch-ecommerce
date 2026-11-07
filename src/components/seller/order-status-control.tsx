"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, XCircle, PackageCheck, Truck } from "lucide-react";
import { orders as ordersApi, apiError } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

// The server's allowed moves (orderController updateOrderStatusController validTransitions);
// cancelling has its own endpoint, so it isn't offered here.
const NEXT: Record<string, string[]> = {
  pending: ["confirmed"],
  confirmed: ["processing", "shipped"],
  processing: ["ready_to_ship", "shipped"],
  ready_to_ship: ["shipped"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
};
// The seller may cancel only before the order ships.
const CANCELLABLE = ["pending", "confirmed", "processing", "ready_to_ship"];
// The app's courier list.
const COURIERS = ["Blue Dart", "Delhivery", "Ecom Express", "Ekart Logistics", "XpressBees", "Shadowfax", "Gati", "Safexpress", "DTDC", "India Post (Speed Post)", "ABC Transport"];
const label = (s: string) => s.replace(/_/g, " ");
// Zatch pickup: one "Pack order" books the Shiprocket courier, which the server only does
// for orders still pending or confirmed. After that Shiprocket moves the status itself and
// the server refuses manual shipped/delivered updates.
const PACKABLE = ["pending", "confirmed"];

type Shipment = { awb?: string | null; courierName?: string | null };

export function OrderStatusControl({ orderId, status, fulfilmentMode, shipments = [] }: { orderId: string; status?: string; fulfilmentMode?: string; shipments?: Shipment[] }) {
  const router = useRouter();
  const [value, setValue] = useState((status ?? "pending").toLowerCase());
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [awb, setAwb] = useState("");
  const [courier, setCourier] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const pickup = fulfilmentMode === "zatch_pickup";
  // Packed here counts at once, before the refreshed list brings the shipments: the server
  // refuses to cancel a packed order, so Cancel must not linger in between.
  const [justPacked, setJustPacked] = useState(false);
  const packed = shipments.length > 0 || justPacked;
  // Pickup orders never offer the manual steps; the seller only packs, then Shiprocket takes over.
  const next = pickup ? [] : NEXT[value] ?? [];
  const canCancel = CANCELLABLE.includes(value) && !(pickup && packed);

  async function update(to: string, tracking?: { awb: string; courier: string }) {
    const t = getToken();
    if (!t || !to) return;
    // The server needs a courier and AWB to mark an order shipped.
    if (to === "shipped" && !tracking) { setShipOpen(true); setCancelOpen(false); return; }
    setBusy(true);
    setErr(null);
    const res = await ordersApi.updateStatus(orderId, { status: to, ...(tracking ? { tracking } : {}) }, t);
    setBusy(false);
    const failure = apiError(res, "Couldn't update. Check the details.");
    if (failure) return setErr(failure);
    // Packing moves the order to ready_to_ship on the server.
    if (to === "pack") setJustPacked(true);
    setValue(to === "pack" ? "ready_to_ship" : to); setSaved(true); setShipOpen(false); router.refresh();
  }

  async function sellerCancel(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    if (!reason.trim()) return setErr("Please provide a reason.");
    setBusy(true);
    setErr(null);
    const res = await ordersApi.sellerCancel(orderId, { reason: reason.trim() }, t);
    setBusy(false);
    const failure = apiError(res, "Couldn't cancel this order. Try again.");
    if (failure) return setErr(failure);
    setValue("cancelled"); setCancelOpen(false); router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-medium capitalize text-ink">{label(value)}</span>
        {next.length > 0 && (
          <select
            value=""
            disabled={busy}
            onChange={(e) => update(e.target.value)}
            aria-label="Move this order to"
            className="h-9 rounded-full border border-hairline bg-surface-2 px-3 text-[13px] font-medium text-ink focus:border-ink focus:outline-none disabled:opacity-70"
          >
            <option value="" disabled>Move to…</option>
            {next.map((s) => <option key={s} value={s} className="capitalize">{label(s)}</option>)}
          </select>
        )}
        {pickup && !packed && PACKABLE.includes(value) && (
          <button onClick={() => update("pack")} disabled={busy} title="Books a courier pickup through Shiprocket"
            className="pill-lime inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold disabled:opacity-60">
            <PackageCheck className="h-4 w-4" /> Pack order
          </button>
        )}
        {canCancel && (
          <button onClick={() => { setCancelOpen((v) => !v); setShipOpen(false); setErr(null); }} disabled={busy} aria-label="Cancel order" title="Cancel order"
            className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-live transition-colors hover:bg-live/5 disabled:opacity-60">
            <XCircle className="h-4 w-4" />
          </button>
        )}
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : saved ? <Check className="h-4 w-4 text-lime-deep" /> : null}
      </div>

      {pickup && packed && (
        <ul className="flex flex-col items-end gap-0.5 text-[12px] text-muted">
          {shipments.map((s, i) => (
            <li key={s.awb ?? i} className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              {s.courierName || "Courier"}{s.awb ? ` · AWB ${s.awb}` : ""}
            </li>
          ))}
          {/* The backend saves a shipment before Shiprocket assigns its AWB, so a parcel with
              no AWB means packing stopped partway, and the server won't retry or cancel it. */}
          {shipments.some((s) => !s.awb)
            ? <li role="alert" className="font-medium text-live">Packing didn&apos;t finish. Contact Zatch support.</li>
            : <li>Shiprocket updates this order from here.</li>}
        </ul>
      )}

      {shipOpen && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-surface-2 p-2">
          <select value={courier} onChange={(e) => setCourier(e.target.value)} aria-label="Courier"
            className="h-9 rounded-full border border-hairline bg-surface px-3 text-[13px] text-ink focus:border-ink focus:outline-none">
            <option value="">Courier…</option>
            {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="Tracking ID (AWB)" aria-label="Tracking ID"
            className="h-9 w-40 rounded-full border border-hairline bg-surface px-3 text-[13px] text-ink focus:border-ink focus:outline-none" />
          <button onClick={() => update("shipped", { awb: awb.trim(), courier })} disabled={!awb.trim() || !courier || busy}
            className="pill-lime rounded-full px-4 py-2 text-[13px] font-semibold disabled:opacity-50">
            Mark shipped
          </button>
          <button onClick={() => { setShipOpen(false); setErr(null); }} className="text-[13px] text-muted hover:text-ink">Cancel</button>
        </div>
      )}

      {cancelOpen && (
        <form onSubmit={sellerCancel} className="flex w-full max-w-sm flex-col gap-2 rounded-2xl bg-surface-2 p-3">
          <label className="text-[13px] font-medium text-ink" htmlFor={`reason-${orderId}`}>Reason for cancellation</label>
          <input id={`reason-${orderId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Out of stock" autoFocus
            className="h-9 rounded-full border border-hairline bg-surface px-3 text-[13px] text-ink focus:border-ink focus:outline-none" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCancelOpen(false)} className="text-[13px] text-muted hover:text-ink">Keep order</button>
            <button disabled={busy} className="rounded-full bg-live px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">Yes, cancel</button>
          </div>
        </form>
      )}
      {err && <p role="alert" className="text-[12px] font-medium text-live">{err}</p>}
    </div>
  );
}
