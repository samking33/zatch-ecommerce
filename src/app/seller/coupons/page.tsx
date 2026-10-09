"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Check, Ticket, Pencil } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { coupons as couponsApi, seller as sellerApi, apiError } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

type Coupon = { _id: string; name?: string; code?: string; discountType?: string; discountValue?: number; minSpend?: number; startDate?: string; endDate?: string; isActive?: boolean; active?: boolean; isExpired?: boolean; status?: string; daysRemaining?: number };
type Dash = {
  performanceSummary?: { orders?: number; gmv?: number; views?: number; period?: string };
  overview?: { totalCoupons?: number; activeCoupons?: number; expiredCoupons?: number };
  coupons?: { all?: Coupon[] };
};

export default function SellerCouponsPage() {
  const [token, setToken] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [list, setList] = useState<Coupon[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [dash, setDash] = useState<Dash | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [seller, setSeller] = useState<{ approved: boolean; status: string; display?: import("@/lib/api").SellerStatusDisplay } | null>(null);

  useEffect(() => {
    const t = getToken();
    setToken(t); setReady(true);
    if (!t) return;
    sellerApi.status(t).then((s) => {
      const status = s ? (s.sellerStatus ?? "buyer").toLowerCase() : "unavailable";
      const approved = ["approved", "active"].includes(status);
      setSeller({ approved, status, display: s?.statusDisplay });
      if (approved) load(t);
    });
  }, []);

  // The dashboard is the seller's own coupons (paused and expired included);
  // /coupons/list is the public buyer-facing listing across all sellers.
  async function load(t: string) {
    const d = (await couponsApi.dashboard(t)) as Dash | null;
    setDash(d);
    setList(d?.coupons?.all ?? []);
  }

  async function toggle(id: string) {
    if (!token) return;
    setNotice(null);
    setList((l) => l.map((c) => (c._id === id ? { ...c, isActive: !(c.isActive ?? c.active) } : c)));
    const res = await couponsApi.toggle(id, token);
    if (!res) setNotice("Couldn't change the coupon. Try again.");
    load(token);
  }
  async function remove(id: string) {
    if (!token) return;
    setNotice(null);
    setList((l) => l.filter((c) => c._id !== id));
    const res = await couponsApi.remove(id, token);
    if (!res) setNotice("Couldn't delete the coupon. Try again.");
    load(token);
  }

  return (
    <SellerShell>
      {ready && !token ? (
        <div className="pt-2"><SignInRequired what="your coupons" /></div>
      ) : seller && !seller.approved ? (
        <BecomeSeller status={seller.status} display={seller.display} />
      ) : (
        <>
          <SellerHeader
            title="Coupons"
            sub={`${list.length} coupon${list.length !== 1 ? "s" : ""}`}
            action={<button onClick={() => setAdding((v) => !v)} className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"><Plus className="h-4 w-4" /> New coupon</button>}
          />

          {dash && (
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Active", value: String(dash.overview?.activeCoupons ?? 0) },
                { label: "Orders", value: String(dash.performanceSummary?.orders ?? 0) },
                { label: "GMV", value: `₹${(dash.performanceSummary?.gmv ?? 0).toLocaleString("en-IN")}` },
                { label: "Views", value: String(dash.performanceSummary?.views ?? 0) },
              ].map((k) => (
                <div key={k.label} className="card rounded-[1.25rem] p-4">
                  <p className="font-display text-xl font-semibold text-ink">{k.value}</p>
                  <p className="text-[12px] text-muted">{k.label}</p>
                </div>
              ))}
            </div>
          )}

          {notice && <p role="alert" className="mb-3 text-sm font-medium text-live">{notice}</p>}

          {adding && token && <CouponForm token={token} onSaved={() => { load(token); setAdding(false); }} />}

          {list.length === 0 && !adding ? (
            <EmptyState title="No coupons yet" sub="Create a discount code to drive more orders." />
          ) : (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {list.map((c) => {
                const active = c.isActive ?? c.active ?? true;
                if (editing?._id === c._id && token) {
                  return (
                    <CouponForm
                      key={c._id}
                      token={token}
                      initial={c}
                      onSaved={() => { load(token); setEditing(null); }}
                    />
                  );
                }
                return (
                  <div key={c._id} className="card flex items-center gap-4 rounded-[1.5rem] p-5">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-surface"><Ticket className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[15px] font-semibold text-ink">{c.code ?? c.name}</p>
                      <p className="text-sm text-muted">
                        {c.discountType === "percentage" ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                        {c.minSpend ? ` · min ₹${c.minSpend}` : ""}
                      </p>
                    </div>
                    {c.isExpired || c.status === "expired" ? (
                      <span title="Edit the end date to reactivate" className="rounded-full bg-live/10 px-3 py-1.5 text-[13px] font-semibold text-live">
                        Expired
                      </span>
                    ) : (
                      <button onClick={() => toggle(c._id)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>
                        {active ? "Active" : "Off"}
                      </button>
                    )}
                    <button onClick={() => setEditing(c)} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(c._id)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-live"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </SellerShell>
  );
}

function CouponForm({ token, onSaved, initial }: { token: string; onSaved: () => void; initial?: Coupon }) {
  // yyyy-mm-dd in IST, which is what the date input and the server's day boundaries use
  const initialEnd = initial?.endDate ? new Date(initial.endDate).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "";
  const [f, setF] = useState({
    name: initial?.name ?? "",
    code: initial?.code ?? "",
    discountType: initial?.discountType ?? "percentage",
    discountValue: initial?.discountValue != null ? String(initial.discountValue) : "",
    maxDiscount: "",
    minSpend: initial?.minSpend != null ? String(initial.minSpend) : "",
    endDate: initialEnd,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const code = f.code.toUpperCase();
    const body = {
      name: f.name || code, discountType: f.discountType,
      discountValue: Number(f.discountValue), maxDiscount: f.maxDiscount ? Number(f.maxDiscount) : undefined,
      minSpend: f.minSpend ? Number(f.minSpend) : undefined,
      // valid through the end of that day, IST; an unchanged date is left as the server has it
      ...(f.endDate !== initialEnd ? { endDate: new Date(`${f.endDate}T23:59:59+05:30`).toISOString() } : {}),
      // The server rejects any `code` once a coupon has been used, even an unchanged one.
      ...(initial ? (code !== initial.code ? { code } : {}) : { code, startDate: new Date().toISOString() }),
    };
    const res = initial ? await couponsApi.update(initial._id, body, token) : await couponsApi.create(body, token);
    setSaving(false);
    const failure = apiError(res, "Couldn't save the coupon. Try again.");
    if (failure) return setErr(failure);
    onSaved();
  }

  return (
    <form onSubmit={save} className="card mb-4 grid gap-3 rounded-[1.5rem] p-6 sm:grid-cols-2">
      <F label="Code" v={f.code} on={set("code")} required />
      <label className="block">
        <span className="text-[12px] font-medium text-muted">Type</span>
        <select value={f.discountType} onChange={set("discountType")} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed ₹</option>
        </select>
      </label>
      <F label={f.discountType === "percentage" ? "Discount %" : "Discount ₹"} v={f.discountValue} on={set("discountValue")} type="number" required />
      <F label="Min spend ₹ (optional)" v={f.minSpend} on={set("minSpend")} type="number" />
      <F label="Valid until" v={f.endDate} on={set("endDate")} type="date" required />
      {err && <p role="alert" className="text-sm font-medium text-live sm:col-span-2">{err}</p>}
      <button disabled={saving} className="btn-ink sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {initial ? "Save changes" : "Create coupon"}
      </button>
    </form>
  );
}
function F({ label, v, on, type = "text", required }: { label: string; v: string; on: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input type={type} required={required} value={v} onChange={on} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
    </label>
  );
}
