"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Loader2, Check } from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { products as productsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { inr } from "@/lib/utils";
import type { Product } from "@/lib/types";

const STATUSES = ["active", "inactive", "draft", "out_of_stock"];

export function ProductManage({ product }: { product: Product & { status?: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState((product.status ?? "active").toLowerCase());
  const [busy, setBusy] = useState(false);
  const [bargainOpen, setBargainOpen] = useState(false);
  const price = product.discountedPrice ?? product.price;

  async function changeStatus(next: string) {
    const t = getToken();
    if (!t) return;
    setBusy(true);
    setStatus(next);
    await productsApi.updateStatus(product._id, { status: next }, t);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card rounded-[1.5rem] p-3">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          <ProductMedia src={product.images?.[0]?.url} alt={product.name} sizes="64px" className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{product.name}</p>
          <p className="mt-0.5 text-sm text-muted">{inr(price)} · {product.totalStock ?? 0} in stock</p>
        </div>
        <select
          value={status}
          disabled={busy}
          onChange={(e) => changeStatus(e.target.value)}
          className="h-9 rounded-full border border-hairline bg-surface-2 px-3 text-[13px] font-medium capitalize text-ink focus:border-ink focus:outline-none disabled:opacity-70"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <button onClick={() => setBargainOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-[13px] font-medium text-ink hover:bg-surface-2">
          <Tag className="h-3.5 w-3.5" /> Bargain
        </button>
        <Link href={`/product/${product._id}`} className="text-[13px] font-medium text-muted hover:text-ink">View</Link>
      </div>
      {bargainOpen && <BargainSettings productId={product._id} initial={product.bargainSettings} onClose={() => setBargainOpen(false)} />}
    </div>
  );
}

function BargainSettings({ productId, initial, onClose }: { productId: string; initial?: { autoAcceptDiscount?: number; maximumDiscount?: number }; onClose: () => void }) {
  const [auto, setAuto] = useState(initial?.autoAcceptDiscount ?? 10);
  const [max, setMax] = useState(initial?.maximumDiscount ?? 30);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    const t = getToken();
    if (!t) return;
    setState("saving");
    await productsApi.setBargainSettings(productId, { autoAcceptDiscount: auto, maximumDiscount: max }, t);
    setState("saved");
    setTimeout(onClose, 800);
  }

  return (
    <div className="mt-3 grid gap-4 rounded-2xl bg-surface-2 p-4 sm:grid-cols-[1fr_1fr_auto]">
      <label className="block">
        <span className="text-[12px] font-medium text-muted">Auto-accept discount %</span>
        <input type="number" min={0} max={100} value={auto} onChange={(e) => setAuto(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-[15px] text-ink focus:border-ink focus:outline-none" />
      </label>
      <label className="block">
        <span className="text-[12px] font-medium text-muted">Max discount %</span>
        <input type="number" min={0} max={100} value={max} onChange={(e) => setMax(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-[15px] text-ink focus:border-ink focus:outline-none" />
      </label>
      <button onClick={save} disabled={state === "saving"} className="btn-ink mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-70">
        {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : null}
        {state === "saved" ? "Saved" : "Save"}
      </button>
    </div>
  );
}
