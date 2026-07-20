"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Lock, Plus, Loader2, Check } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { cart as cartApi, address as addressApi, checkout as checkoutApi, api } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { inr } from "@/lib/utils";

type Addr = { _id: string; label?: string; line1?: string; city?: string; state?: string; pincode?: string; phone?: string };
type CItem = {
  productId?: string;
  product?: { _id?: string } | string | null;
  variant?: { color?: string; size?: string };
  color?: string;
  size?: string;
  bargainId?: string;
};
type Cart = { items?: CItem[]; total?: number; subtotal?: number };

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addrs, setAddrs] = useState<Addr[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const tk = getToken();
    setToken(tk);
    setReady(true);
    if (!tk) return;
    cartApi.get(tk).then((c) => setCart((c as Cart) ?? { items: [] }));
    addressApi.list(tk).then((a) => {
      const list = (a as Addr[]) ?? [];
      setAddrs(list);
      if (list[0]) setSelected(list[0]._id);
    });
  }, []);

  const items = cart?.items ?? [];
  const total = cart?.total ?? cart?.subtotal ?? 0;

  async function pay() {
    setError(null);
    if (!token) return router.push("/login");
    if (!selected) return setError("Add a delivery address first.");
    if (items.length === 0) return setError("Your cart is empty.");

    setPaying(true);
    const checkoutData = {
      addressId: selected,
      items: items.map((it) => ({
        productId: it.productId ?? (typeof it.product === "object" ? it.product?._id : it.product),
        variantColor: it.variant?.color ?? it.color,
        variantSize: it.variant?.size ?? it.size,
        bargainId: it.bargainId,
      })),
    };

    const init = (await api<{ razorpayOrderId: string; amount: number; keyId: string; currency?: string }>(
      "/checkout/payment/razorpay/initiate",
      { method: "POST", body: { checkoutData }, token },
    )) as { razorpayOrderId: string; amount: number; keyId: string; currency?: string } | null;

    if (!init?.razorpayOrderId || !init?.keyId) {
      setPaying(false);
      return setError("Couldn't start payment. Please try again.");
    }

    const ok = await loadRazorpay();
    if (!ok) {
      setPaying(false);
      return setError("Payment library failed to load.");
    }

    const RZP = (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay;
    const rzp = new RZP({
      key: init.keyId,
      order_id: init.razorpayOrderId,
      amount: init.amount,
      currency: init.currency ?? "INR",
      name: "Zatch",
      description: "Order payment",
      theme: { color: "#cafe38" },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const verified = await checkoutApi.razorpayVerify(resp, token);
        setPaying(false);
        if (verified) router.push("/orders");
        else setError("Payment verification failed. If money was deducted, contact support.");
      },
      modal: { ondismiss: () => setPaying(false) },
    });
    rzp.open();
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        <div className="px-1 py-8">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-ink">Checkout</h1>
        </div>

        {ready && !token ? (
          <SignInRequired what="checkout" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col gap-4">
              <section className="card rounded-[1.75rem] p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
                    <MapPin className="h-5 w-5" /> Delivery address
                  </h2>
                  <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-2">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>

                {addrs.length === 0 && !adding && (
                  <p className="mt-4 text-[15px] text-muted">No saved address. Add one to continue.</p>
                )}

                <div className="mt-4 space-y-2.5">
                  {addrs.map((a) => (
                    <label key={a._id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hairline bg-surface-2 px-4 py-3.5 has-[:checked]:border-ink">
                      <input type="radio" name="addr" checked={selected === a._id} onChange={() => setSelected(a._id)} className="mt-1 accent-ink" />
                      <span className="text-[15px] text-ink">
                        <span className="font-medium">{a.label ?? "Address"}</span>
                        <span className="block text-sm text-muted">
                          {[a.line1, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                          {a.phone ? ` · ${a.phone}` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                {adding && (
                  <AddressForm
                    onSaved={(a) => {
                      setAddrs((l) => [...l, a]);
                      setSelected(a._id);
                      setAdding(false);
                    }}
                    token={token!}
                  />
                )}
              </section>

              <section className="card rounded-[1.75rem] p-6 sm:p-7">
                <h2 className="font-display text-lg font-semibold text-ink">Items ({items.length})</h2>
                {items.length === 0 ? (
                  <p className="mt-3 text-muted">Your cart is empty. <Link href="/shop" className="font-medium text-ink underline">Browse products</Link></p>
                ) : (
                  <p className="mt-3 text-[15px] text-muted">{items.length} item(s) ready to checkout.</p>
                )}
              </section>
            </div>

            <aside className="card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-28">
              <h2 className="font-display text-lg font-semibold text-ink">Order total</h2>
              <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-display text-2xl font-semibold text-ink">{inr(total)}</span>
              </div>
              {error && <p className="mt-3 rounded-xl bg-live/10 px-3.5 py-2.5 text-sm font-medium text-live">{error}</p>}
              <button
                onClick={pay}
                disabled={paying || items.length === 0}
                className="pill-lime mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-60"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {paying ? "Processing…" : `Pay ${inr(total)}`}
              </button>
              <p className="mt-3 text-center text-[13px] text-muted">Secured by Razorpay</p>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function AddressForm({ onSaved, token }: { onSaved: (a: Addr) => void; token: string }) {
  const [f, setF] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = (await addressApi.save(f, token)) as { _id?: string; address?: Addr } | Addr | null;
    setSaving(false);
    const saved = (res as { address?: Addr })?.address ?? (res as Addr);
    if (saved && (saved as Addr)._id) onSaved(saved as Addr);
    else onSaved({ _id: crypto.randomUUID(), ...f });
  }

  return (
    <form onSubmit={save} className="mt-4 grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
      <Field label="Label" v={f.label} on={set("label")} />
      <Field label="Phone" v={f.phone} on={set("phone")} />
      <Field label="Address" v={f.line1} on={set("line1")} full />
      <Field label="City" v={f.city} on={set("city")} />
      <Field label="State" v={f.state} on={set("state")} />
      <Field label="Pincode" v={f.pincode} on={set("pincode")} />
      <button disabled={saving} className="btn-ink sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save address
      </button>
    </form>
  );
}

function Field({ label, v, on, full }: { label: string; v: string; on: (e: React.ChangeEvent<HTMLInputElement>) => void; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input required value={v} onChange={on} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
    </label>
  );
}
