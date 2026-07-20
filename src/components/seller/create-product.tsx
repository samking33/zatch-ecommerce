"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check, Upload, X } from "lucide-react";
import { getToken } from "@/lib/client-auth";
import type { Category } from "@/lib/types";

// Real 3-step create matching the backend: step 1 (basics → productId),
// step 2 (colors), step 3 (multipart images + sizes).
export function CreateProduct({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [s1, setS1] = useState({
    category: categories[0]?.slug ?? "", subCategory: "", name: "", description: "",
    price: "", discountedPrice: "", totalStock: "", hasColor: true, hasSize: false,
    autoAcceptDiscount: "10", maximumDiscount: "30",
  });
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const cat = categories.find((c) => c.slug === s1.category);
  const subs = (cat?.subCategories ?? []) as { name: string; slug: string }[];

  async function postJson(body: unknown) {
    const t = getToken();
    const res = await fetch("/api/v1/product/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => null);
  }

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await postJson({
      step: "1", productId,
      category: s1.category, subCategory: s1.subCategory || undefined,
      name: s1.name, description: s1.description,
      price: Number(s1.price), discountedPrice: s1.discountedPrice ? Number(s1.discountedPrice) : undefined,
      totalStock: Number(s1.totalStock || 0), hasColor: s1.hasColor, hasSize: s1.hasSize,
      bargainSettings: { autoAcceptDiscount: Number(s1.autoAcceptDiscount), maximumDiscount: Number(s1.maximumDiscount) },
    });
    setBusy(false);
    if (res?.success && res.productId) { setProductId(res.productId); setStep(s1.hasColor ? 2 : 3); }
    else setError(res?.message ?? "Couldn't save. Check the fields.");
  }

  async function submitStep2() {
    setBusy(true); setError(null);
    const res = await postJson({ step: "2", productId, colors });
    setBusy(false);
    if (res?.success) setStep(3); else setError(res?.message ?? "Couldn't save colours.");
  }

  async function submitStep3() {
    setBusy(true); setError(null);
    const t = getToken();
    const fd = new FormData();
    fd.append("step", "3");
    fd.append("productId", productId ?? "");
    sizes.forEach((s) => fd.append("sizes", s));
    files.forEach((f) => fd.append("images", f));
    const res = await fetch("/api/v1/product/create", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd })
      .then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.success) router.push("/seller/products");
    else setError(res?.message ?? "Couldn't upload images.");
  }

  return (
    <div className="card mx-auto max-w-2xl rounded-[2rem] p-6 sm:p-8">
      {/* stepper */}
      <div className="mb-6 flex items-center gap-2">
        {["Basics", "Colours", "Images"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold ${i + 1 <= step ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
            <span className={`text-sm font-medium ${i + 1 === step ? "text-ink" : "text-muted"}`}>{label}</span>
            {i < 2 && <span className={`h-0.5 flex-1 rounded ${i + 1 < step ? "bg-lime" : "bg-hairline"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={submitStep1} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Category</span>
            <select value={s1.category} onChange={(e) => setS1({ ...s1, category: e.target.value, subCategory: "" })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
              {categories.filter((c) => c.slug !== "explore-all").map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Sub-category</span>
            <select value={s1.subCategory} onChange={(e) => setS1({ ...s1, subCategory: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
              <option value="">Select</option>
              {subs.map((s) => <option key={s.slug ?? s.name} value={s.slug ?? s.name}>{s.name}</option>)}
            </select>
          </label>
          <Field label="Product name" value={s1.name} on={(v) => setS1({ ...s1, name: v })} full required />
          <Field label="Description" value={s1.description} on={(v) => setS1({ ...s1, description: v })} full />
          <Field label="Price (₹)" value={s1.price} on={(v) => setS1({ ...s1, price: v })} type="number" required />
          <Field label="Discounted price (₹)" value={s1.discountedPrice} on={(v) => setS1({ ...s1, discountedPrice: v })} type="number" />
          <Field label="Total stock" value={s1.totalStock} on={(v) => setS1({ ...s1, totalStock: v })} type="number" />
          <div className="flex items-end gap-4">
            <Toggle label="Has colours" on={s1.hasColor} set={(v) => setS1({ ...s1, hasColor: v })} />
            <Toggle label="Has sizes" on={s1.hasSize} set={(v) => setS1({ ...s1, hasSize: v })} />
          </div>
          <Field label="Auto-accept discount %" value={s1.autoAcceptDiscount} on={(v) => setS1({ ...s1, autoAcceptDiscount: v })} type="number" />
          <Field label="Max bargain discount %" value={s1.maximumDiscount} on={(v) => setS1({ ...s1, maximumDiscount: v })} type="number" />
          {error && <p className="text-sm font-medium text-live sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Next busy={busy}>Continue</Next>
          </div>
        </form>
      )}

      {step === 2 && (
        <div>
          <p className="text-[15px] text-muted">Add the colours this product comes in.</p>
          <div className="mt-3 flex gap-2">
            <input value={colorInput} onChange={(e) => setColorInput(e.target.value)} placeholder="e.g. Black" className="h-11 flex-1 rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
            <button onClick={() => { if (colorInput.trim()) { setColors([...colors, colorInput.trim()]); setColorInput(""); } }} className="btn-ink rounded-full px-5 text-sm font-semibold">Add</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-ink">
                {c} <button onClick={() => setColors(colors.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
          {error && <p className="mt-3 text-sm font-medium text-live">{error}</p>}
          <div className="mt-6 flex gap-3">
            <Back onClick={() => setStep(1)} />
            <button onClick={submitStep2} disabled={busy} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          {s1.hasSize && (
            <div className="mb-5">
              <p className="text-[15px] text-muted">Sizes</p>
              <div className="mt-2 flex gap-2">
                <input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} placeholder="e.g. M" className="h-11 flex-1 rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
                <button onClick={() => { if (sizeInput.trim()) { setSizes([...sizes, sizeInput.trim()]); setSizeInput(""); } }} className="btn-ink rounded-full px-5 text-sm font-semibold">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((s, i) => <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-ink">{s} <button onClick={() => setSizes(sizes.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button></span>)}
              </div>
            </div>
          )}
          <p className="text-[15px] text-muted">Product images</p>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hairline bg-surface-2 py-10 text-muted hover:border-ink">
            <Upload className="h-6 w-6" />
            <span className="text-sm font-medium">{files.length ? `${files.length} image(s) selected` : "Click to choose images"}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          </label>
          {error && <p className="mt-3 text-sm font-medium text-live">{error}</p>}
          <div className="mt-6 flex gap-3">
            <Back onClick={() => setStep(s1.hasColor ? 2 : 1)} />
            <button onClick={submitStep3} disabled={busy || files.length === 0} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Publish product
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, on, type = "text", full, required }: { label: string; value: string; on: (v: string) => void; type?: string; full?: boolean; required?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input type={type} required={required} value={value} onChange={(e) => on(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
    </label>
  );
}
function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => set(!on)} className="flex items-center gap-2 text-sm font-medium text-ink">
      <span className={`grid h-6 w-10 items-center rounded-full p-0.5 transition-colors ${on ? "bg-lime" : "bg-hairline"}`}>
        <span className={`h-5 w-5 rounded-full bg-surface transition-transform ${on ? "translate-x-4" : ""}`} />
      </span>
      {label}
    </button>
  );
}
function Next({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button type="submit" disabled={busy} className="pill-lime inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {children}</button>;
}
function Back({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink hover:bg-surface-2"><ArrowLeft className="h-4 w-4" /> Back</button>;
}
