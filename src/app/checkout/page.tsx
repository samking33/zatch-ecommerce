"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Lock, Plus, Loader2, Check } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { cart as cartApi, address as addressApi, checkout as checkoutApi, apiError } from "@/lib/api";
import { getToken, getAppliedCoupon, setAppliedCoupon } from "@/lib/client-auth";
import { inr } from "@/lib/utils";

type Addr = { _id: string; label?: string; type?: string; line1?: string; city?: string; state?: string; pincode?: string; phone?: string };
type CItem = { _id?: string };
type Cart = { items?: CItem[]; total?: number; subtotal?: number; coupon?: unknown };
type Money = { subtotal?: number; discount?: number; shipping?: number; tax?: number; total?: number };
type Preview = { checkout?: { pricing?: Money }; success?: boolean; message?: string };
type Init = {
  razorpayOrderId?: string; amount?: number; keyId?: string; currency?: string;
  checkoutData?: unknown; success?: boolean; message?: string;
};

// Cart checkout, the same flow the mobile app uses: the server prices the saved
// cart lines itself (quantity, bargain price) and clears them once paid. The
// coupon code is only sent while the cart still has a coupon applied.
function cartPayload(cart: Cart | null, addressId: string | undefined) {
  const couponCode = cart?.coupon ? getAppliedCoupon() : undefined;
  return { addressId, selectedItemIds: (cart?.items ?? []).map((it) => it._id).filter(Boolean), couponCode };
}

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

  // Server-side price preview (bargains, coupon, shipping, tax) - recomputed
  // whenever the chosen address changes, since shipping can depend on it.
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    if (!token || items.length === 0) return;
    checkoutApi
      .initiate(cartPayload(cart, selected || undefined), token)
      .then((p) => setPreview((p as Preview) ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selected, items.length]);

  const sum = preview?.checkout?.pricing ?? {};
  const total = sum.total ?? cart?.total ?? cart?.subtotal ?? 0;
  const previewError = apiError(preview, "");

  async function pay() {
    setError(null);
    if (!token) return router.push("/login");
    if (!selected) return setError("Add a delivery address first.");
    if (items.length === 0) return setError("Your cart is empty.");

    setPaying(true);
    const init = (await checkoutApi.razorpayInitiate({ checkoutData: cartPayload(cart, selected) }, token)) as Init | null;

    const initError = apiError(init, "Couldn't start payment. Please try again.");
    if (initError || !init?.razorpayOrderId || !init?.keyId) {
      setPaying(false);
      return setError(initError ?? "Couldn't start payment. Please try again.");
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
        // The server wants camelCase ids plus the same checkoutData it returned from initiate.
        const verified = await checkoutApi.razorpayVerify(
          {
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
            checkoutData: init.checkoutData,
          },
          token,
        );
        setPaying(false);
        const failure = apiError(verified, "Payment verification failed.");
        if (failure) setError(`${failure} If money was deducted, contact support.`);
        else { setAppliedCoupon(undefined); router.push("/orders"); }
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
              <dl className="mt-4 space-y-2.5 text-[15px]">
                {sum.subtotal != null && <PRow label="Subtotal" value={inr(sum.subtotal)} />}
                {sum.discount ? <PRow label="Discount" value={`− ${inr(sum.discount)}`} /> : null}
                {sum.shipping != null && <PRow label="Shipping" value={sum.shipping ? inr(sum.shipping) : "Free"} />}
                {sum.tax ? <PRow label="Tax (GST)" value={inr(sum.tax)} /> : null}
                <div className="border-t border-hairline pt-2.5">
                  <PRow label="Total" value={inr(total)} strong />
                </div>
              </dl>
              {(error || previewError) && <p role="alert" className="mt-3 rounded-xl bg-live/10 px-3.5 py-2.5 text-sm font-medium text-live">{error ?? previewError}</p>}
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
  // The backend stores the address kind as both `label` and `type` (Home | Office | Others).
  const [f, setF] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^\d{6}$/.test(f.pincode.trim())) return setErr("Enter a 6-digit pincode.");
    setSaving(true);
    const res = await addressApi.save({ ...f, type: f.label }, token);
    setSaving(false);
    // The helper unwraps `{ success, address }` to the address itself.
    const saved = ((res as { address?: Addr } | null)?.address ?? res) as Addr | null;
    const failure = apiError(res, "Couldn't save the address. Try again.");
    if (failure || !saved?._id) return setErr(failure ?? "Couldn't save the address. Try again.");
    onSaved(saved);
  }

  return (
    <form onSubmit={save} className="mt-4 grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
      <label className="block">
        <span className="text-[12px] font-medium text-muted">Type</span>
        <select value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
          {["Home", "Office", "Others"].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <Field label="Phone" v={f.phone} on={set("phone")} />
      <Field label="Address" v={f.line1} on={set("line1")} full />
      <Field label="City" v={f.city} on={set("city")} />
      <Field label="State" v={f.state} on={set("state")} />
      <Field label="Pincode" v={f.pincode} on={set("pincode")} />
      {err && <p role="alert" className="text-sm font-medium text-live sm:col-span-2">{err}</p>}
      <button disabled={saving} className="btn-ink sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save address
      </button>
    </form>
  );
}

function PRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-display text-2xl font-semibold text-ink" : "font-medium text-ink"}>{value}</dd>
    </div>
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
