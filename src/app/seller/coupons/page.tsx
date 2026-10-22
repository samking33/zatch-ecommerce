"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Check, Ticket, Pencil } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { coupons as couponsApi, seller as sellerApi, products as productsApi, apiError } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { inr } from "@/lib/utils";

type Coupon = {
  _id: string; name?: string; code?: string; discountType?: string; discountValue?: number; maxDiscount?: number | null; minSpend?: number;
  startDate?: string; endDate?: string; isActive?: boolean; active?: boolean; isExpired?: boolean; status?: string; daysRemaining?: number;
  appliedProducts?: { _id: string; name?: string }[];
  stats?: { orders?: number; revenue?: number };
};
type MyProduct = { _id: string; name: string };
const PERIODS = [{ key: "week", label: "This week" }, { key: "month", label: "This month" }, { key: "year", label: "This year" }];
// As in the app, paused coupons are listed with the expired ones.
const isLive = (c: Coupon) => !!c.isActive && !c.isExpired;

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
  const [added, setAdded] = useState<string | null>(null);
  const [period, setPeriod] = useState("week");
  const [tab, setTab] = useState<"active" | "expired">("active");
  const [mine, setMine] = useState<MyProduct[]>([]);
  const [seller, setSeller] = useState<{ approved: boolean; status: string; display?: import("@/lib/api").SellerStatusDisplay } | null>(null);

  useEffect(() => {
    const t = getToken();
    setToken(t); setReady(true);
    if (!t) return;
    sellerApi.status(t).then((s) => {
      const status = s ? (s.sellerStatus ?? "buyer").toLowerCase() : "unavailable";
      const approved = ["approved", "active"].includes(status);
      setSeller({ approved, status, display: s?.statusDisplay });
      if (approved) {
        load(t, "week");
        productsApi.myProducts(t).then((p) => setMine((p ?? []).map(({ _id, name }) => ({ _id, name }))));
      }
    });
  }, []);

  // The dashboard is the seller's own coupons (paused and expired included);
  // /coupons/list is the public buyer-facing listing across all sellers.
  async function load(t: string, p = period) {
    const d = (await couponsApi.dashboard(t, p)) as Dash | null;
    setDash(d);
    setList(d?.coupons?.all ?? []);
  }

  async function toggle(id: string) {
    if (!token) return;
    setNotice(null);
    const wasActive = list.find((c) => c._id === id)?.isActive ?? true;
    setList((l) => l.map((c) => (c._id === id ? { ...c, isActive: !wasActive } : c)));
    const res = await couponsApi.toggle(id, wasActive, token);
    const failure = apiError(res, "Couldn't change the coupon. Try again.");
    if (failure) setNotice(failure);
    load(token);
  }
  async function remove(c: Coupon) {
    if (!token || !confirm(`Are you sure you want to delete '${c.name ?? c.code}'? This action cannot be undone.`)) return;
    const id = c._id;
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
            action={<button onClick={() => { setAdding((v) => !v); setAdded(null); }} className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"><Plus className="h-4 w-4" /> New coupon</button>}
          />

          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                aria-pressed={p.key === period}
                onClick={() => { setPeriod(p.key); if (token) load(token, p.key); }}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${p.key === period ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}
              >
                {p.label}
              </button>
            ))}
          </div>

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

          {added && (
            <p role="status" className="mb-3 flex items-center gap-2 rounded-2xl bg-lime/30 px-4 py-3 text-sm font-medium text-ink">
              <Check className="h-4 w-4 text-lime-deep" /> {added} added successfully
            </p>
          )}

          {adding && token && <CouponForm token={token} products={mine} onSaved={(code) => { load(token); setAdding(false); setAdded(code); setTab("active"); }} />}

          {list.length > 0 && (
            <div role="tablist" className="mb-1 flex gap-1.5">
              {(["active", "expired"] as const).map((k) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${tab === k ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}>
                  {k === "active" ? "Active" : "Expired"} ({list.filter((c) => isLive(c) === (k === "active")).length})
                </button>
              ))}
            </div>
          )}

          {list.length === 0 && !adding ? (
            <EmptyState title="No coupons yet" sub="Create a discount code to drive more orders." />
          ) : list.length > 0 && !list.some((c) => isLive(c) === (tab === "active")) ? (
            <p className="py-8 text-center text-sm text-muted">No {tab === "active" ? "active" : "expired or inactive"} coupons found.</p>
          ) : (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {list.filter((c) => isLive(c) === (tab === "active")).map((c) => {
                const active = c.isActive ?? c.active ?? true;
                if (editing?._id === c._id && token) {
                  return (
                    <CouponForm
                      products={mine}
                      key={c._id}
                      token={token}
                      initial={c}
                      onSaved={() => { load(token); setEditing(null); }}
                    />
                  );
                }
                return (
                  <div key={c._id} className="card rounded-[1.5rem] p-5">
                    <div className="flex items-center gap-4">
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
                      <button onClick={() => remove(c)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-live"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        ["Orders", String(c.stats?.orders ?? 0)],
                        ["Products", c.appliedProducts?.length ? String(c.appliedProducts.length) : "All"],
                        ["Total revenue", inr(c.stats?.revenue ?? 0)],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-xl bg-surface-2 py-2">
                          <p className="text-[15px] font-semibold text-ink">{v}</p>
                          <p className="text-[11px] text-muted">{k}</p>
                        </div>
                      ))}
                    </div>
                    {!!c.appliedProducts?.length && (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-muted hover:text-ink">Products in this coupon</summary>
                        <ul className="mt-2 space-y-1 text-ink">
                          {c.appliedProducts.map((p) => <li key={p._id}><Link href={`/product/${p._id}`} className="hover:underline">{p.name ?? "Product"}</Link></li>)}
                        </ul>
                      </details>
                    )}
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

function CouponForm({ token, onSaved, initial, products }: { token: string; onSaved: (code: string) => void; initial?: Coupon; products: MyProduct[] }) {
  // Which products the coupon covers; none ticked means all of the seller's products.
  const [picked, setPicked] = useState<string[]>(() => (initial?.appliedProducts ?? []).map((x) => x._id));
  const togglePick = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  // yyyy-mm-dd in IST, which is what the date input and the server's day boundaries use
  const initialEnd = initial?.endDate ? new Date(initial.endDate).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "";
  const [f, setF] = useState({
    name: initial?.name ?? "",
    code: initial?.code ?? "",
    discountType: initial?.discountType ?? "percentage",
    discountValue: initial?.discountValue != null ? String(initial.discountValue) : "",
    maxDiscount: initial?.maxDiscount != null ? String(initial.maxDiscount) : "",
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
      discountValue: Number(f.discountValue),
      // null clears a cap the seller emptied
      maxDiscount: f.discountType === "percentage" && f.maxDiscount ? Number(f.maxDiscount) : null,
      // Create takes `productIds` (checked against the seller's own); update takes `applicableProducts`.
      ...(initial ? { applicableProducts: picked } : { productIds: picked }),
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
    onSaved(code);
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
      {f.discountType === "percentage" && <F label="Max discount ₹ (optional)" v={f.maxDiscount} on={set("maxDiscount")} type="number" />}
      <F label="Min spend ₹ (optional)" v={f.minSpend} on={set("minSpend")} type="number" />
      <F label="Valid until" v={f.endDate} on={set("endDate")} type="date" required />
      {products.length > 0 && (
        <fieldset className="sm:col-span-2">
          <legend className="text-[12px] font-medium text-muted">Applies to {picked.length ? `${picked.length} product${picked.length !== 1 ? "s" : ""}` : "all your products"}</legend>
          <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-hairline p-2">
            {products.map((p) => (
              <label key={p._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface-2">
                <input type="checkbox" checked={picked.includes(p._id)} onChange={() => togglePick(p._id)} className="h-4 w-4 accent-ink" />
                <span className="line-clamp-1">{p.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
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
