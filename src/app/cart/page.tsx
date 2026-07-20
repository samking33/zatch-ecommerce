"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus, X, Tag, ArrowRight, ShoppingBag, Loader2 } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { ProductMedia } from "@/components/ui/product-media";
import { cart as cartApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { inr } from "@/lib/utils";

type CartItem = {
  _id?: string;
  product?: { _id?: string; name?: string; images?: { url: string }[] } | string;
  name?: string;
  image?: string;
  variant?: { color?: string; size?: string };
  color?: string;
  size?: string;
  qty?: number;
  cartPrice?: number;
  price?: number;
  bargainId?: string;
};
type Cart = {
  items?: CartItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  totalItems?: number;
};

function itemName(it: CartItem) {
  if (typeof it.product === "object" && it.product?.name) return it.product.name;
  return it.name ?? "Item";
}
function itemImage(it: CartItem) {
  if (typeof it.product === "object") return it.product?.images?.[0]?.url;
  return it.image;
}
function itemPrice(it: CartItem) {
  return it.cartPrice ?? it.price ?? 0;
}

export default function CartPage() {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    setReady(true);
    if (!t) {
      setLoading(false);
      return;
    }
    cartApi.get(t).then((c) => {
      setCart((c as Cart) ?? { items: [] });
      setLoading(false);
    });
  }, []);

  async function changeQty(it: CartItem, qty: number) {
    if (!token) return;
    const productId = typeof it.product === "object" ? it.product?._id : it.product;
    setCart((c) =>
      c
        ? { ...c, items: c.items?.map((x) => (x === it ? { ...x, qty } : x)) }
        : c,
    );
    await cartApi.update({ productId, qty, variant: it.variant }, token);
    const fresh = await cartApi.get(token);
    setCart((fresh as Cart) ?? cart);
  }

  async function remove(it: CartItem) {
    if (!token) return;
    const productId = typeof it.product === "object" ? it.product?._id : it.product;
    setCart((c) => (c ? { ...c, items: c.items?.filter((x) => x !== it) } : c));
    await cartApi.remove({ productId, variant: it.variant }, token);
  }

  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function applyCoupon() {
    if (!token || !coupon.trim()) return;
    const res = await cartApi.applyCoupon({ code: coupon.trim().toUpperCase() }, token);
    if (res) {
      setCart((await cartApi.get(token)) as Cart);
      setCouponMsg({ ok: true, text: "Coupon applied" });
    } else {
      setCouponMsg({ ok: false, text: "Invalid or expired coupon" });
    }
  }
  async function removeCoupon() {
    if (!token) return;
    await cartApi.removeCoupon(token);
    setCart((await cartApi.get(token)) as Cart);
    setCoupon("");
    setCouponMsg(null);
  }

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? items.reduce((s, it) => s + itemPrice(it) * (it.qty ?? 1), 0);
  const total = cart?.total ?? subtotal;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        <div className="px-1 py-8">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-ink">
            Your cart
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            {items.length} item{items.length !== 1 && "s"}
          </p>
        </div>

        {ready && !token ? (
          <SignInRequired what="your cart" />
        ) : loading ? (
          <div className="card grid place-items-center rounded-[2rem] p-16 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="card grid place-items-center rounded-[2rem] p-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <p className="mt-4 font-display text-2xl font-semibold text-ink">Your cart is empty</p>
            <p className="mt-2 text-muted">Go strike a deal.</p>
            <Link href="/shop" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col gap-4">
              {items.map((it, idx) => {
                const qty = it.qty ?? 1;
                return (
                  <div key={it._id ?? idx} className="card flex items-center gap-4 rounded-[1.5rem] p-3">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                      <ProductMedia src={itemImage(it)} alt={itemName(it)} sizes="96px" className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{itemName(it)}</p>
                        <button onClick={() => remove(it)} aria-label="Remove item" className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm text-muted">
                        {[it.variant?.color ?? it.color, it.variant?.size ?? it.size].filter(Boolean).join(" · ")}
                      </p>
                      {it.bargainId && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-lime px-2 py-0.5 text-[11px] font-semibold text-lime-ink">
                          <Tag className="h-3 w-3" /> Bargained
                        </span>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1 rounded-full border border-hairline p-1">
                          <button onClick={() => changeQty(it, Math.max(1, qty - 1))} aria-label="Decrease" className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-2">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                          <button onClick={() => changeQty(it, qty + 1)} aria-label="Increase" className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-2">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="font-display text-lg font-semibold text-ink">{inr(itemPrice(it) * qty)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-28">
              <h2 className="font-display text-lg font-semibold text-ink">Summary</h2>

              {/* coupon */}
              <div className="mt-4">
                {cart?.discount ? (
                  <div className="flex items-center justify-between rounded-2xl bg-lime px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-lime-ink">
                      <Tag className="h-3.5 w-3.5" /> Coupon applied
                    </span>
                    <button onClick={removeCoupon} className="text-sm font-medium text-lime-ink/70 hover:text-lime-ink">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Coupon code"
                      className="h-11 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-sm uppercase text-ink placeholder:normal-case placeholder:text-muted focus:border-ink focus:outline-none"
                    />
                    <button onClick={applyCoupon} className="btn-ink rounded-full px-5 py-2.5 text-sm font-semibold">Apply</button>
                  </div>
                )}
                {couponMsg && (
                  <p className={`mt-2 text-[13px] font-medium ${couponMsg.ok ? "text-ink" : "text-live"}`}>{couponMsg.text}</p>
                )}
              </div>

              <dl className="mt-4 space-y-3 text-[15px]">
                <Row label="Subtotal" value={inr(subtotal)} />
                {cart?.discount ? <Row label="Discount" value={`− ${inr(cart.discount)}`} /> : null}
                {cart?.tax ? <Row label="Tax" value={inr(cart.tax)} /> : null}
                <div className="border-t border-hairline pt-3">
                  <Row label="Total" value={inr(total)} strong />
                </div>
              </dl>
              <Link href="/checkout" className="pill-lime mt-5 flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold">
                Checkout <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-[13px] text-muted">Secure payment via Razorpay</p>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-display text-xl font-semibold text-ink" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}
