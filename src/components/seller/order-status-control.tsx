"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, XCircle } from "lucide-react";
import { orders as ordersApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

// Forward-only fulfillment steps a seller advances through.
const FLOW = ["pending", "confirmed", "processing", "ready_to_ship", "shipped", "out_for_delivery", "delivered"];

export function OrderStatusControl({ orderId, status }: { orderId: string; status?: string }) {
  const router = useRouter();
  const [value, setValue] = useState((status ?? "pending").toLowerCase());
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [awb, setAwb] = useState("");
  const [courier, setCourier] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const done = value === "delivered" || value === "cancelled" || value === "returned";

  async function update(next: string, tracking?: { awb: string; courier: string }) {
    const t = getToken();
    if (!t) return;
    // Backend requires tracking.awb + tracking.courier to mark an order shipped.
    if (next === "shipped" && !tracking) { setShipOpen(true); return; }
    setBusy(true);
    setValue(next);
    const res = await ordersApi.updateStatus(orderId, { status: next, ...(tracking ? { tracking } : {}) }, t);
    setBusy(false);
    if (res) { setSaved(true); setShipOpen(false); router.refresh(); }
    else { setValue(status ?? "pending"); setErr("Couldn't update. Check the details."); }
  }

  async function sellerCancel() {
    const t = getToken();
    if (!t) return;
    const reason = window.prompt("Why are you cancelling this order?");
    if (reason === null) return;
    setBusy(true);
    const res = await ordersApi.sellerCancel(orderId, { reason: reason || "Seller cancelled" }, t);
    setBusy(false);
    if (res) { setValue("cancelled"); router.refresh(); }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <select
          value={value}
          disabled={busy || done}
          onChange={(e) => update(e.target.value)}
          className="h-9 rounded-full border border-hairline bg-surface-2 px-3 text-[13px] font-medium capitalize text-ink focus:border-ink focus:outline-none disabled:opacity-70"
        >
          {FLOW.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          {done && !FLOW.includes(value) && <option value={value}>{value}</option>}
        </select>
        {!done && (
          <button onClick={sellerCancel} disabled={busy} title="Cancel order" className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-live transition-colors hover:bg-live/5 disabled:opacity-60">
            <XCircle className="h-4 w-4" />
          </button>
        )}
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : saved ? <Check className="h-4 w-4 text-lime-deep" /> : null}
      </div>

      {shipOpen && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-surface-2 p-2">
          <input
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="Courier"
            className="h-9 w-28 rounded-full border border-hairline bg-surface px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
          <input
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
            placeholder="AWB number"
            className="h-9 w-36 rounded-full border border-hairline bg-surface px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
          <button
            onClick={() => update("shipped", { awb: awb.trim(), courier: courier.trim() })}
            disabled={!awb.trim() || !courier.trim() || busy}
            className="pill-lime rounded-full px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
          >
            Mark shipped
          </button>
          <button onClick={() => { setShipOpen(false); setErr(null); }} className="text-[13px] text-muted hover:text-ink">Cancel</button>
        </div>
      )}
      {err && <p className="text-[12px] font-medium text-live">{err}</p>}
    </div>
  );
}
