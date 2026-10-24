"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Lock, Plus, Minus, Loader2, Tag, X, CircleCheck, Clock } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { AddressForm, type Addr } from "@/components/account/address-form";
import { useAuth } from "@/components/auth/auth-provider";
import { address as addressApi, checkout as checkoutApi, coupons as couponsApi, apiError } from "@/lib/api";
import { getToken, getAppliedCoupon, setAppliedCoupon } from "@/lib/client-auth";
import { buyHref, parseBuyItems, type BuyItem } from "@/lib/checkout-link";
import { inr, variantText } from "@/lib/utils";
import { trackPurchase } from "@/lib/gtag";

type PItem = {
  _id?: string;
  product?: { _id?: string; name?: string; price?: number; images?: { url?: string }[]; sellerId?: string };
  variant?: { color?: string | null; size?: string | null };
  qty?: number;
  cartPrice?: number;
  bargainId?: string | null;
  sellerId?: string | null;
};
type Preview = {
  success?: boolean;
  message?: string;
  checkout?: { items?: PItem[]; pricing?: { subtotal?: number; discount?: number; shipping?: number; total?: number } };
};
type Coupon = { _id: string; code: string; name?: string; discountText?: string; minSpend?: number; appliedProducts?: { _id: string }[] };
type Init = {
  success?: boolean; message?: string; razorpayOrderId?: string; amount?: number; currency?: string; keyId?: string;
  name?: string; email?: string; phone?: string; checkoutData?: unknown;
};
type Verified = { success?: boolean; code?: string; message?: string; orders?: { _id?: string; orderId?: string }[] };

const same = (a?: string | null, b?: string | null) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
const matches = (p: PItem, b: BuyItem) =>
  (p.product?._id ?? "") === b.productId && same(p.variant?.color, b.variantColor) && same(p.variant?.size, b.variantSize);

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Two ways in, same as the app: `?items=[...]` buys those items directly (Buy now, Pay on an
// accepted bargain, Buy again) without touching the cart; otherwise it is the cart, or only
// the lines in `?ids=a,b`. The server prices everything: bargain prices, coupon, shipping.
export default function CheckoutPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [direct, setDirect] = useState<BuyItem[] | null>(null);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [addrs, setAddrs] = useState<Addr[]>([]);
  const [selected, setSelected] = useState("");
  const [adding, setAdding] = useState(false);
  const [coupon, setCoupon] = useState<string | undefined>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pricing, setPricing] = useState(true);
  const [paying, setPaying] = useState(false);
  const { user } = useAuth();

  // Closing the tab while the payment is being confirmed could lose the order screen; ask first.
  useEffect(() => {
    if (!paying) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [paying]);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Verified["orders"] | null>(null);
  const [underReview, setUnderReview] = useState<string | null>(null);

  useEffect(() => {
    const tk = getToken();
    setToken(tk);
    const q = new URLSearchParams(window.location.search);
    if (q.has("items")) setDirect(parseBuyItems(q.get("items")));
    else {
      const ids = (q.get("ids") ?? "").split(",").filter(Boolean);
      // Without ids the server would price every stored cart line, including ones the cart page
      // hides (sold or removed products), so the cart picks the lines first.
      if (ids.length === 0) { router.replace("/cart"); return; }
      setCartIds(ids);
      // A code applied on the cart page carries over to a cart checkout.
      setCoupon(getAppliedCoupon());
    }
    setReady(true);
    if (!tk) return;
    addressApi.list(tk).then((a) => {
      const list = (a as Addr[] | null) ?? [];
      setAddrs(list);
      const pick = list.find((x) => x.isDefault) ?? list.find((x) => same(x.type, "home")) ?? list[0];
      if (pick) setSelected(pick._id);
    });
  }, []);

  // Cart mode always has ids: a checkout without them goes back to the cart (see above).
  const payload = (couponCode = coupon) =>
    direct
      ? { addressId: selected || undefined, items: direct, couponCode }
      : { addressId: selected || undefined, selectedItemIds: cartIds, couponCode };

  // Re-price whenever anything that changes the total changes.
  const key = JSON.stringify([selected, coupon, direct, cartIds]);
  useEffect(() => {
    if (!ready || !token || (direct && direct.length === 0)) { setPricing(false); return; }
    let alive = true;
    setPricing(true);
    checkoutApi.initiate(payload(), token).then((p) => {
      if (!alive) return;
      setPreview((p as Preview | null) ?? { success: false, message: "Couldn't load prices. Try again." });
      setPricing(false);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, key]);

  const lines = preview?.checkout?.items ?? [];
  const sum = preview?.checkout?.pricing ?? {};
  const previewError = preview && preview.success === false ? preview.message ?? "Couldn't load prices." : null;
  const mrp = lines.reduce((s, l) => s + (l.product?.price ?? l.cartPrice ?? 0) * (l.qty ?? 1), 0);
  const productSaving = Math.max(0, mrp - (sum.subtotal ?? mrp));

  // Coupons from the sellers in this order that cover at least one of its products.
  const [offers, setOffers] = useState<Coupon[]>([]);
  const sellerIds = useMemo(
    () => [...new Set(lines.map((l) => l.sellerId ?? l.product?.sellerId).filter((x): x is string => !!x))],
    [lines],
  );
  const productIds = lines.map((l) => l.product?._id).filter(Boolean);
  useEffect(() => {
    if (!token || sellerIds.length === 0) return;
    Promise.all(sellerIds.map((s) => couponsApi.list(token, s))).then((res) => {
      const all = res.flatMap((r) => (r as Coupon[] | null) ?? []);
      setOffers(all.filter((c) => !c.appliedProducts?.length || c.appliedProducts.some((p) => productIds.includes(p._id))));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sellerIds.join()]);

  const [code, setCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  async function applyCoupon(raw: string) {
    const next = raw.trim().toUpperCase();
    if (!token || !next) return;
    setCouponBusy(true);
    setCouponError(null);
    // Try it first, so a code that doesn't apply leaves the current total alone.
    const res = (await checkoutApi.initiate(payload(next), token)) as Preview | null;
    setCouponBusy(false);
    const failure = apiError(res, "Couldn't apply the coupon. Try again.");
    if (failure) return setCouponError(failure);
    setCoupon(next);
    setCode("");
  }
  function removeCoupon() {
    setCoupon(undefined);
    setCouponError(null);
    if (!direct) setAppliedCoupon(undefined);
  }

  function setDirectItems(next: BuyItem[]) {
    setDirect(next);
    window.history.replaceState(null, "", buyHref(next));
  }

  async function pay() {
    setError(null);
    if (!token) return router.push("/login");
    if (!selected) return setError("Add a delivery address first.");
    setPaying(true);
    const init = (await checkoutApi.razorpayInitiate({ checkoutData: payload() }, token)) as Init | null;
    const initError = apiError(init, "Couldn't start payment. Please try again.");
    if (initError || !init?.razorpayOrderId || !init.keyId) {
      setPaying(false);
      return setError(initError ?? "Couldn't start payment. Please try again.");
    }
    if (!(await loadRazorpay())) {
      setPaying(false);
      return setError("The payment window couldn't load. Check your connection and try again.");
    }

    const RZP = (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay;
    new RZP({
      key: init.keyId,
      order_id: init.razorpayOrderId,
      amount: init.amount,
      currency: init.currency ?? "INR",
      name: "Zatch",
      description: "Order payment",
      prefill: { name: init.name, email: init.email, contact: init.phone },
      theme: { color: "#cafe38" },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const v = (await checkoutApi.razorpayVerify(
          {
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
            checkoutData: init.checkoutData,
          },
          token,
        )) as Verified | null;
        setPaying(false);
        if (v?.success) {
          if (!direct) setAppliedCoupon(undefined);
          // Google Ads purchase conversion; the Razorpay order id keeps it to one per order.
          trackPurchase(resp.razorpay_order_id, typeof init.amount === "number" ? init.amount / 100 : undefined, init.currency ?? "INR");
          setPlaced(v.orders ?? []);
        } else if (v?.code === "PAYMENT_UNDER_REVIEW") {
          setUnderReview(v.message ?? "Payment received. Your order is being confirmed.");
        } else {
          setError(`${v?.message ?? "We couldn't confirm the payment."} If money was taken, it is safe: contact support with this payment ID: ${resp.razorpay_payment_id}`);
        }
      },
      modal: { ondismiss: () => { setPaying(false); setError("Payment was not completed. You can try again."); } },
    }).open();
  }

  if (placed || underReview) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
          <div className="card mx-auto mt-6 max-w-lg rounded-[2rem] p-8 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-lime text-lime-ink">
              {placed ? <CircleCheck className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold text-ink">{placed ? "Order placed" : "Payment received"}</h1>
            {placed ? (
              <p className="mt-2 text-[15px] text-muted">
                {placed.length > 1 ? "Order IDs " : "Order ID "}
                <span className="font-semibold text-ink">{placed.map((o) => `#${o.orderId ?? o._id}`).join(", ")}</span>
              </p>
            ) : (
              <p className="mt-2 text-[15px] text-muted">{underReview}</p>
            )}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link href="/orders" className="btn-ink rounded-full py-3 text-sm font-semibold">View orders</Link>
              <Link href="/" className="rounded-full border border-hairline py-3 text-sm font-semibold text-ink hover:bg-surface-2">Back to home</Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Cart lines removed since the cart page was opened (another tab, sold out) price to nothing.
  const empty = direct
    ? direct.length === 0
    : !pricing && (previewError === "Cart is empty" || (!!preview && !previewError && lines.length === 0));

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        <div className="px-1 py-8">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-ink">Checkout</h1>
        </div>

        {ready && !token ? (
          <SignInRequired what="checkout" />
        ) : empty ? (
          <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
            <p className="font-display text-2xl font-semibold text-ink">Nothing to check out</p>
            {!direct && <p className="mt-2 text-muted">These items are no longer in your cart.</p>}
            <Link href={direct ? "/shop" : "/cart"} className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">{direct ? "Browse products" : "Back to cart"}</Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col gap-4">
              <section className="card rounded-[1.75rem] p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold text-ink">Items</h2>
                  {!direct && <Link href="/cart" className="text-sm font-medium text-muted hover:text-ink">Edit cart</Link>}
                </div>
                <div className="mt-4 space-y-3">
                  {pricing && lines.length === 0 ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted" />
                  ) : direct ? (
                    direct.map((b, i) => {
                      const line = lines.find((l) => matches(l, b));
                      return (
                        <ItemRow key={`${b.productId}-${b.variantColor}-${b.variantSize}`} line={line} qty={b.qty} bargain={!!b.bargainId}
                          // A bargain is for a fixed quantity, so only plain items can change it.
                          onQty={b.bargainId ? undefined : (q) => setDirectItems(direct.map((x, j) => (j === i ? { ...x, qty: q } : x)))}
                          onRemove={() => setDirectItems(direct.filter((_, j) => j !== i))}
                        />
                      );
                    })
                  ) : (
                    lines.map((l) => <ItemRow key={l._id} line={l} qty={l.qty ?? 1} bargain={!!l.bargainId} />)
                  )}
                </div>
              </section>

              <section className="card rounded-[1.75rem] p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
                    <MapPin className="h-5 w-5" /> Delivery address
                  </h2>
                  <div className="flex items-center gap-3">
                    {addrs.length > 0 && <Link href="/account/addresses" className="text-sm font-medium text-muted hover:text-ink">Manage</Link>}
                    <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-2">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
                {addrs.length === 0 && !adding && <p className="mt-4 text-[15px] text-muted">No saved address. Add one to continue.</p>}
                <div className="mt-4 space-y-2.5">
                  {addrs.map((a) => (
                    <label key={a._id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hairline bg-surface-2 px-4 py-3.5 has-[:checked]:border-ink">
                      <input type="radio" name="addr" checked={selected === a._id} onChange={() => setSelected(a._id)} className="mt-1 accent-ink" />
                      <span className="text-[15px] text-ink">
                        <span className="font-medium">{a.label ?? "Address"}</span>
                        <span className="block text-sm text-muted">
                          {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                          {a.phone ? ` · ${a.phone}` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {adding && token && (
                  <div className="mt-4"><AddressForm token={token} onSaved={(a) => { setAddrs((l) => [...l, a]); setSelected(a._id); setAdding(false); }} /></div>
                )}
                {(user?.email || user?.phone) && (
                  <p className="mt-4 text-sm text-muted">
                    Order updates go to {[user.email, user.phone].filter(Boolean).join(" and ")}.
                  </p>
                )}
              </section>

              <section className="card rounded-[1.75rem] p-6 sm:p-7">
                <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink"><Tag className="h-5 w-5" /> Coupon</h2>
                {coupon ? (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-lime px-4 py-3">
                    <span className="text-sm font-semibold text-lime-ink">
                      {coupon} applied{sum.discount ? ` · you save ${inr(sum.discount)}` : ""}
                    </span>
                    <button onClick={removeCoupon} className="text-sm font-medium text-lime-ink/70 hover:text-lime-ink">Remove</button>
                  </div>
                ) : (
                  <>
                    <form onSubmit={(e) => { e.preventDefault(); applyCoupon(code); }} className="mt-4 flex gap-2">
                      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code"
                        className="h-11 min-w-0 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-sm uppercase text-ink placeholder:normal-case placeholder:text-muted focus:border-ink focus:outline-none" />
                      <button disabled={couponBusy || !code.trim()} className="btn-ink inline-flex items-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-60">
                        {couponBusy && <Loader2 className="h-4 w-4 animate-spin" />} Apply
                      </button>
                    </form>
                    {offers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {offers.map((c) => (
                          <button key={c._id} onClick={() => applyCoupon(c.code)} disabled={couponBusy}
                            className="rounded-2xl border border-dashed border-hairline bg-surface-2 px-3.5 py-2 text-left hover:border-ink disabled:opacity-60">
                            <span className="block text-sm font-semibold text-ink">{c.code} · {c.discountText}</span>
                            {c.minSpend ? <span className="block text-[12px] text-muted">On orders above {inr(c.minSpend)}</span> : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {couponError && <p role="alert" className="mt-2 text-sm font-medium text-live">{couponError}</p>}
              </section>
            </div>

            <aside className="card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-28">
              <h2 className="font-display text-lg font-semibold text-ink">Order total</h2>
              <dl className="mt-4 space-y-2.5 text-[15px]">
                <PRow label={`Items (${lines.length})`} value={inr(mrp)} />
                {productSaving > 0 && <PRow label="Discount on MRP" value={`− ${inr(productSaving)}`} />}
                {sum.discount ? <PRow label="Coupon" value={`− ${inr(sum.discount)}`} /> : null}
                {sum.shipping != null && <PRow label="Shipping" value={sum.shipping ? inr(sum.shipping) : "Free"} />}
                <div className="border-t border-hairline pt-2.5">
                  <PRow label="Total" value={pricing ? "…" : inr(sum.total ?? 0)} strong />
                </div>
              </dl>
              {(error || previewError) && <p role="alert" className="mt-3 rounded-xl bg-live/10 px-3.5 py-2.5 text-sm font-medium text-live">{error ?? previewError}</p>}
              <button
                onClick={pay}
                disabled={paying || pricing || !!previewError || !lines.length}
                className="pill-lime mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-60"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {paying ? "Processing…" : `Pay ${pricing ? "" : inr(sum.total ?? 0)}`}
              </button>
              <p className="mt-3 text-center text-[13px] text-muted">Prepaid only, secured by Razorpay</p>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function ItemRow({ line, qty, bargain, onQty, onRemove }: { line?: PItem; qty: number; bargain: boolean; onQty?: (q: number) => void; onRemove?: () => void }) {
  const name = line?.product?.name ?? "Item no longer available";
  const unit = line?.cartPrice ?? 0;
  const list = line?.product?.price ?? unit;
  const variant = variantText(" · ", line?.variant?.color, line?.variant?.size);
  return (
    <div className="flex items-center gap-3">
      <Link href={line?.product?._id ? `/product/${line.product._id}` : "#"} className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
        <ProductMedia src={line?.product?.images?.[0]?.url} alt={name} sizes="64px" className="h-full w-full" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[15px] font-medium text-ink">{name}</p>
        <p className="text-[13px] text-muted">{variant}{bargain ? `${variant ? " · " : ""}Bargained price` : ""}</p>
        {line && (
          <p className="text-sm">
            <span className="font-semibold text-ink">{inr(unit)}</span>
            {list > unit && <span className="ml-2 text-muted line-through">{inr(list)}</span>}
            {!onQty && <span className="ml-2 text-muted">× {qty}</span>}
          </p>
        )}
      </div>
      {onQty && (
        <div className="inline-flex items-center gap-1 rounded-full border border-hairline p-1">
          <button onClick={() => onQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Decrease quantity" className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
          <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
          <button onClick={() => onQty(Math.min(99, qty + 1))} aria-label="Increase quantity" className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-2"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {onRemove && (
        <button onClick={onRemove} aria-label={`Remove ${name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"><X className="h-4 w-4" /></button>
      )}
    </div>
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
