"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Check, Loader2, Truck, ShieldCheck, RefreshCw } from "lucide-react";
import { BargainBox } from "./bargain-box";
import { cart as cartApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import type { Product, Variant } from "@/lib/types";

export function ProductPurchase({ product }: { product: Product }) {
  const router = useRouter();
  const price = product.discountedPrice ?? product.price;
  const variants = product.variants ?? [];

  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean) as string[])],
    [variants],
  );
  const [color, setColor] = useState<string | undefined>(colors[0]);

  const sizes = useMemo(
    () =>
      [
        ...new Set(
          variants
            .filter((v) => (color ? v.color === color : true))
            .map((v) => v.size)
            .filter(Boolean) as string[],
        ),
      ],
    [variants, color],
  );
  const [size, setSize] = useState<string | undefined>(sizes[0]);

  const swatch = (c: string): Variant | undefined =>
    variants.find((v) => v.color === c && v.images?.length);

  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle");

  async function addToCart() {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setStatus("adding");
    const res = await cartApi.update(
      { productId: product._id, color, size, qty: 1 },
      token,
    );
    setStatus(res ? "added" : "error");
  }

  return (
    <>
      <div className="card rounded-[2rem] p-6 sm:p-8">
        {product.brand && (
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted">
            {product.brand}
          </p>
        )}
        <h1 className="mt-1.5 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold text-ink">
          {product.name}
        </h1>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="font-display text-3xl font-semibold text-ink">₹{price.toLocaleString("en-IN")}</span>
          {product.discountedPrice && product.discountedPrice < product.price && (
            <span className="text-lg text-muted line-through">₹{product.price.toLocaleString("en-IN")}</span>
          )}
        </div>

        {colors.length > 0 && (
          <div className="mt-6">
            <p className="text-[13px] font-medium text-muted">
              Colour{color ? <span className="text-ink"> · {color}</span> : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {colors.map((c) => {
                const v = swatch(c);
                const active = c === color;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setSize(undefined);
                    }}
                    aria-label={c}
                    aria-pressed={active}
                    className={`h-11 w-11 overflow-hidden rounded-full p-0.5 ring-2 transition ${
                      active ? "ring-ink" : "ring-hairline hover:ring-ink/40"
                    }`}
                  >
                    {v?.images?.[0]?.url ? (
                      <Image src={v.images[0].url} alt={c} width={44} height={44} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center rounded-full bg-surface-2 text-[10px] font-semibold uppercase text-ink">
                        {c.slice(0, 3)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mt-5">
            <p className="text-[13px] font-medium text-muted">Size</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  aria-pressed={s === size}
                  className={`min-w-[3rem] rounded-xl border px-3.5 py-2.5 text-sm font-medium capitalize transition ${
                    s === size ? "border-ink bg-ink text-surface" : "border-hairline bg-surface-2 text-ink hover:border-ink"
                  }`}
                >
                  {s.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7">
          {status === "added" ? (
            <div className="flex items-center gap-3 rounded-full bg-lime px-4 py-3">
              <Check className="h-5 w-5 text-lime-ink" />
              <span className="text-[15px] font-semibold text-lime-ink">Added to cart</span>
              <Link href="/cart" className="btn-ink ml-auto rounded-full px-5 py-2.5 text-sm font-semibold">
                View cart
              </Link>
            </div>
          ) : (
            <button
              onClick={addToCart}
              disabled={status === "adding"}
              className="btn-ink inline-flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold disabled:opacity-70"
            >
              {status === "adding" ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <ShoppingBag className="h-[18px] w-[18px]" />}
              {status === "adding" ? "Adding…" : "Add to cart"}
            </button>
          )}
          {status === "error" && (
            <p className="mt-2 text-sm font-medium text-live">Couldn&apos;t add to cart. Try again.</p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {([[Truck, "Free delivery"], [ShieldCheck, "Buyer protected"], [RefreshCw, "7-day returns"]] as const).map(
            ([Icon, label], i) => (
              <div key={i} className="rounded-2xl bg-surface-2 px-2 py-3">
                <Icon className="mx-auto h-5 w-5 text-ink" />
                <p className="mt-1.5 text-[12px] text-muted">{label}</p>
              </div>
            ),
          )}
        </div>
      </div>

      <BargainBox
        productId={product._id}
        listPrice={price}
        color={color}
        size={size}
        autoAcceptDiscount={product.bargainSettings?.autoAcceptDiscount ?? 10}
        maxDiscount={product.bargainSettings?.maximumDiscount ?? 30}
      />
    </>
  );
}
