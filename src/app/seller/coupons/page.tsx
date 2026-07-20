"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Check, Ticket } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { coupons as couponsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

type Coupon = { _id: string; name?: string; code?: string; discountType?: string; discountValue?: number; minSpend?: number; isActive?: boolean; active?: boolean };

export default function SellerCouponsPage() {
  const [token, setToken] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [list, setList] = useState<Coupon[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = getToken();
    setToken(t); setReady(true);
    if (t) couponsApi.list(t).then((c) => setList((c as Coupon[]) ?? []));
  }, []);

  async function toggle(id: string) {
    if (!token) return;
    setList((l) => l.map((c) => (c._id === id ? { ...c, isActive: !(c.isActive ?? c.active) } : c)));
    await couponsApi.toggle(id, token);
  }
  async function remove(id: string) {
    if (!token) return;
    setList((l) => l.filter((c) => c._id !== id));
    await couponsApi.remove(id, token);
  }

  return (
    <SellerShell>
      {ready && !token ? (
        <div className="pt-2"><SignInRequired what="your coupons" /></div>
      ) : (
        <>
          <SellerHeader
            title="Coupons"
            sub={`${list.length} coupon${list.length !== 1 ? "s" : ""}`}
            action={<button onClick={() => setAdding((v) => !v)} className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"><Plus className="h-4 w-4" /> New coupon</button>}
          />

          {adding && token && <CouponForm token={token} onSaved={(c) => { setList((l) => [c, ...l]); setAdding(false); }} />}

          {list.length === 0 && !adding ? (
            <EmptyState title="No coupons yet" sub="Create a discount code to drive more orders." />
          ) : (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {list.map((c) => {
                const active = c.isActive ?? c.active ?? true;
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
                    <button onClick={() => toggle(c._id)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>
                      {active ? "Active" : "Off"}
                    </button>
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

function CouponForm({ token, onSaved }: { token: string; onSaved: (c: Coupon) => void }) {
  const [f, setF] = useState({ name: "", code: "", discountType: "percentage", discountValue: "", maxDiscount: "", minSpend: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: f.name || f.code, code: f.code.toUpperCase(), discountType: f.discountType,
      discountValue: Number(f.discountValue), maxDiscount: f.maxDiscount ? Number(f.maxDiscount) : undefined,
      minSpend: f.minSpend ? Number(f.minSpend) : undefined,
      startDate: new Date().toISOString(),
    };
    const res = (await couponsApi.create(body, token)) as { coupon?: Coupon } | Coupon | null;
    setSaving(false);
    const saved = (res as { coupon?: Coupon })?.coupon ?? (res as Coupon);
    onSaved(saved && (saved as Coupon)._id ? (saved as Coupon) : { _id: crypto.randomUUID(), ...body, isActive: true } as Coupon);
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
      <button disabled={saving} className="btn-ink sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create coupon
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
