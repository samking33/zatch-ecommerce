"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { orders as ordersApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

// Forward-only fulfillment steps a seller advances through.
const FLOW = ["pending", "confirmed", "processing", "ready_to_ship", "shipped", "out_for_delivery", "delivered"];

export function OrderStatusControl({ orderId, status }: { orderId: string; status?: string }) {
  const router = useRouter();
  const [value, setValue] = useState((status ?? "pending").toLowerCase());
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const done = value === "delivered" || value === "cancelled" || value === "returned";

  async function update(next: string) {
    const t = getToken();
    if (!t) return;
    setBusy(true);
    setValue(next);
    const res = await ordersApi.updateStatus(orderId, { status: next }, t);
    setBusy(false);
    if (res) { setSaved(true); router.refresh(); } else setValue(status ?? "pending");
  }

  return (
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
      {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : saved ? <Check className="h-4 w-4 text-lime-deep" /> : null}
    </div>
  );
}
