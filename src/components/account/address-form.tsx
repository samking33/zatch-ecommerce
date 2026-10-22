"use client";

import { useState } from "react";
import { MapPin, Loader2, Check } from "lucide-react";
import { address as addressApi, apiError } from "@/lib/api";

export type Addr = {
  _id: string; label?: string; type?: string; isDefault?: boolean; line1?: string; line2?: string;
  city?: string; state?: string; pincode?: string; phone?: string;
};

const ADDRESS_TYPES = ["Home", "Office", "Others"];

/** Add or edit an address (same fields and rules as the app's address screen). */
export function AddressForm({ token, onSaved, initial }: { token: string; onSaved: (a: Addr) => void; initial?: Addr }) {
  const [f, setF] = useState({
    label: initial?.label ?? "Home",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? "",
    phone: initial?.phone ?? "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  // Browser geolocation -> backend reverse-geocode -> autofill.
  function useMyLocation() {
    if (!navigator.geolocation) return setErr("Your browser can't share your location.");
    setLocating(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const a = await addressApi.geocode(lat, lng, token);
        setLocating(false);
        setCoords({ lat, lng });
        if (a) setF((prev) => ({
          ...prev,
          line1: a.line1?.trim() || a.formatted || prev.line1,
          city: a.city || prev.city,
          state: a.state || prev.state,
          pincode: a.pincode || prev.pincode,
        }));
        else setErr("Couldn't find an address for your location. Fill it in below.");
      },
      () => { setLocating(false); setErr("Location access was blocked. Fill in the address below."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^\d{6}$/.test(f.pincode.trim())) return setErr("Enter a 6-digit pincode.");
    if (!/^\d{10}$/.test(f.phone.trim())) return setErr("Enter a 10-digit phone number.");
    setSaving(true);
    const body = {
      ...f,
      // `type` must be Home | Office | Others; older addresses may carry a free-text label.
      type: ADDRESS_TYPES.includes(f.label) ? f.label : initial?.type ?? "Others",
      // The server clears the default flag unless it is sent again.
      isDefault: initial?.isDefault ?? false,
      ...(coords ?? {}),
    };
    const res = initial ? await addressApi.update(initial._id, body, token) : await addressApi.save(body, token);
    setSaving(false);
    // The helper unwraps `{ success, address }` to the address itself.
    const saved = ((res as { address?: Addr } | null)?.address ?? res) as Addr | null;
    const failure = apiError(res, "Couldn't save the address. Try again.");
    if (failure || !saved?._id) return setErr(failure ?? "Couldn't save the address. Try again.");
    onSaved(saved);
  }

  return (
    <form onSubmit={save} className="card grid gap-3 rounded-[1.5rem] p-6 sm:grid-cols-2">
      <label className="block">
        <span className="text-[12px] font-medium text-muted">Type</span>
        <select value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
          {ADDRESS_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
          {!ADDRESS_TYPES.includes(f.label) && <option value={f.label}>{f.label}</option>}
        </select>
      </label>
      <F label="Phone" v={f.phone} on={set("phone")} inputMode="tel" />
      <F label="Flat, building, street" v={f.line1} on={set("line1")} full />
      <F label="Area, landmark (optional)" v={f.line2} on={set("line2")} full optional />
      <F label="City" v={f.city} on={set("city")} />
      <F label="State" v={f.state} on={set("state")} />
      <F label="Pincode" v={f.pincode} on={set("pincode")} inputMode="numeric" />
      {err && <p role="alert" className="text-sm font-medium text-live sm:col-span-2">{err}</p>}
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full border border-hairline py-2.5 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
      >
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        {locating ? "Finding you…" : "Use my current location"}
      </button>
      <button disabled={saving} className="pill-lime sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save address
      </button>
    </form>
  );
}

function F({ label, v, on, full, optional, inputMode }: {
  label: string; v: string; on: (e: React.ChangeEvent<HTMLInputElement>) => void; full?: boolean; optional?: boolean;
  inputMode?: "tel" | "numeric";
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input required={!optional} inputMode={inputMode} value={v} onChange={on} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
    </label>
  );
}
