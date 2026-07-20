"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, Loader2, Check } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { address as addressApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

type Addr = { _id: string; label?: string; line1?: string; city?: string; state?: string; pincode?: string; phone?: string };

export default function AddressesPage() {
  const [token, setToken] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [list, setList] = useState<Addr[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    setReady(true);
    if (t) addressApi.list(t).then((a) => setList((a as Addr[]) ?? []));
  }, []);

  async function remove(id: string) {
    if (!token) return;
    setList((l) => l.filter((a) => a._id !== id));
    await addressApi.remove(id, token);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        <div className="flex items-center justify-between px-1 py-8">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-widest text-muted">Account</p>
            <h1 className="mt-1 font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-ink">Addresses</h1>
          </div>
          {token && (
            <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-surface">
              <Plus className="h-4 w-4" /> Add address
            </button>
          )}
        </div>

        {ready && !token ? (
          <SignInRequired what="your addresses" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {adding && token && (
              <AddressForm token={token} onSaved={(a) => { setList((l) => [...l, a]); setAdding(false); }} />
            )}
            {list.map((a) => (
              <div key={a._id} className="card flex items-start gap-3 rounded-[1.5rem] p-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-semibold text-ink">{a.label ?? "Address"}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {[a.line1, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                    {a.phone ? ` · ${a.phone}` : ""}
                  </p>
                </div>
                <button onClick={() => remove(a._id)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-live">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {list.length === 0 && !adding && (
              <div className="card rounded-[1.5rem] p-8 text-muted lg:col-span-2">
                No saved addresses yet. <Link href="#" onClick={() => setAdding(true)} className="font-medium text-ink underline">Add one</Link> for faster checkout.
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function AddressForm({ token, onSaved }: { token: string; onSaved: (a: Addr) => void }) {
  const [f, setF] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = (await addressApi.save(f, token)) as { address?: Addr } | Addr | null;
    setSaving(false);
    const saved = (res as { address?: Addr })?.address ?? (res as Addr);
    onSaved(saved && (saved as Addr)._id ? (saved as Addr) : { _id: crypto.randomUUID(), ...f });
  }

  return (
    <form onSubmit={save} className="card grid gap-3 rounded-[1.5rem] p-6 sm:grid-cols-2">
      <F label="Label" v={f.label} on={set("label")} />
      <F label="Phone" v={f.phone} on={set("phone")} />
      <F label="Address" v={f.line1} on={set("line1")} full />
      <F label="City" v={f.city} on={set("city")} />
      <F label="State" v={f.state} on={set("state")} />
      <F label="Pincode" v={f.pincode} on={set("pincode")} />
      <button disabled={saving} className="pill-lime sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save address
      </button>
    </form>
  );
}

function F({ label, v, on, full }: { label: string; v: string; on: (e: React.ChangeEvent<HTMLInputElement>) => void; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input required value={v} onChange={on} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
    </label>
  );
}
