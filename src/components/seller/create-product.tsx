"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check, Upload, X } from "lucide-react";
import { getToken } from "@/lib/client-auth";
import type { Category } from "@/lib/types";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

// Real 4-step create matching the backend: step 1 (basics → productId),
// step 2 (colors), step 3 (multipart images + sizes), step 4 (stock per variant).
// Step 4 is what creates the variants and makes the product active.
export function CreateProduct({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [s1, setS1] = useState({
    category: categories[0]?.slug ?? "", subCategory: "", name: "", description: "",
    price: "", discountedPrice: "", totalStock: "",
    // Colours and sizes are always collected; the backend needs them to build variants.
    hasColor: true, hasSize: true,
    autoAcceptDiscount: "10", maximumDiscount: "30",
  });
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  // Extra images per colour (keyed by lower-cased colour) and stock per variant row.
  const [colorFiles, setColorFiles] = useState<Record<string, File[]>>({});
  const [stock, setStock] = useState<Record<string, string>>({});
  const [published, setPublished] = useState(false);

  // Until step 4 succeeds the product is only a draft that buyers can't see, so warn before the tab is closed.
  useEffect(() => {
    if (!productId || published) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [productId, published]);

  // The backend uppercases sizes, so compare case-insensitively ("s" and "S" are one size).
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const hasSize = (v: string) => sizes.some((x) => same(x, v));
  // Updater form, so quick successive taps never overwrite each other.
  const addSize = (v: string) => {
    const s = v.trim();
    if (s) setSizes((cur) => (cur.some((x) => same(x, s)) ? cur : [...cur, s]));
  };
  const toggleSize = (v: string) =>
    setSizes((cur) => (cur.some((x) => same(x, v)) ? cur.filter((x) => !same(x, v)) : [...cur, v]));

  // The backend lower-cases colours and upper-cases sizes, so key everything the same way.
  const colorKey = (c: string) => c.trim().toLowerCase();

  const cat = categories.find((c) => c.slug === s1.category);
  const subs = (cat?.subCategories ?? []) as { name: string; slug: string }[];

  async function postJson(body: unknown) {
    const t = getToken();
    return fetch("/api/v1/product/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    }).then((r) => r.json()).catch(() => null);
  }

  // The backend quietly clamps a too-high discounted price down to the price, so catch it here.
  function step1Problem(): string | null {
    const price = Number(s1.price);
    const stock = Number(s1.totalStock);
    const auto = Number(s1.autoAcceptDiscount);
    const max = Number(s1.maximumDiscount);
    if (!(price > 0)) return "Enter a price above 0.";
    if (s1.discountedPrice !== "") {
      const d = Number(s1.discountedPrice);
      if (!(d > 0)) return "The discounted price must be above 0.";
      if (d >= price) return "The discounted price must be lower than the price.";
    }
    if (!Number.isInteger(stock) || stock < 1) return "Total stock must be a whole number, 1 or more.";
    if (![auto, max].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return "Bargain percentages must be between 0 and 100.";
    if (auto > max) return "Auto-accept discount can't be higher than the max bargain discount.";
    return null;
  }

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    const problem = step1Problem();
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    const res = await postJson({
      step: "1", productId,
      category: s1.category, subCategory: s1.subCategory || undefined,
      name: s1.name, description: s1.description,
      price: Number(s1.price), discountedPrice: s1.discountedPrice ? Number(s1.discountedPrice) : undefined,
      totalStock: Number(s1.totalStock || 0), hasColor: s1.hasColor, hasSize: s1.hasSize,
      bargainSettings: { autoAcceptDiscount: Number(s1.autoAcceptDiscount), maximumDiscount: Number(s1.maximumDiscount) },
    });
    if (!res?.success || !res.productId) {
      setBusy(false);
      setError(res?.message ?? "Couldn't save. Check the fields.");
      return;
    }
    setProductId(res.productId);
    if (s1.hasColor) { setBusy(false); setStep(2); return; }
    // The server only lets step 3 run after step 2, so a product without colours still records an empty step 2.
    const skip = await postJson({ step: "2", productId: res.productId, colors: [] });
    setBusy(false);
    if (skip?.success) setStep(3); else setError(skip?.message ?? "Couldn't save. Check the fields.");
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
    if (s1.hasSize) fd.append("sizes", JSON.stringify(sizes));
    files.forEach((f) => fd.append("images", f));
    // Colour images go under variantImages[colour][DEFAULT]; the server reuses them for every size of that colour.
    if (s1.hasColor) colors.forEach((c) => (colorFiles[colorKey(c)] ?? []).forEach((f) => fd.append(`variantImages[${colorKey(c)}][DEFAULT]`, f)));
    const res = await fetch("/api/v1/product/create", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd })
      .then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.success) setStep(4); else setError(res?.message ?? "Couldn't upload images.");
  }

  // One stock row per variant the product has.
  const rows: { key: string; label: string; color?: string; size?: string }[] =
    s1.hasColor && s1.hasSize ? colors.flatMap((c) => sizes.map((sz) => ({ key: `${colorKey(c)}|${sz.toUpperCase()}`, label: `${c} / ${sz}`, color: colorKey(c), size: sz })))
    : s1.hasColor ? colors.map((c) => ({ key: colorKey(c), label: c, color: colorKey(c) }))
    : s1.hasSize ? sizes.map((sz) => ({ key: sz.toUpperCase(), label: sz, size: sz }))
    : [{ key: "all", label: "Units in stock" }];
  // A product with no variants has a single row, which starts at the stock entered in step 1.
  const stockOf = (key: string) => stock[key] ?? (!s1.hasColor && !s1.hasSize ? s1.totalStock : "");
  const allocated = rows.reduce((n, r) => n + (Number(stockOf(r.key)) || 0), 0);
  const declared = Number(s1.totalStock || 0);

  async function submitStep4() {
    setBusy(true); setError(null);
    const variantStock = rows
      .filter((r) => Number(stockOf(r.key)) > 0)
      .map((r) => ({ color: r.color, size: r.size, stock: Number(stockOf(r.key)) }));
    const res = await postJson({ step: "4", productId, variantStock });
    setBusy(false);
    if (res?.success) { setPublished(true); router.push("/seller/products"); }
    // e.g. "Total variant stock exceeds declared stock" or "No valid variants created" + the reason
    else setError([res?.message, res?.details].filter(Boolean).join(". ") || "Couldn't save the stock.");
  }

  return (
    <div className="card mx-auto max-w-2xl rounded-[2rem] p-6 sm:p-8">
      {/* stepper */}
      <div className="mb-6 flex items-center gap-2">
        {["Basics", "Colours", "Images", "Stock"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold ${i + 1 <= step ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
            <span className={`hidden text-sm font-medium sm:inline ${i + 1 === step ? "text-ink" : "text-muted"}`}>{label}</span>
            {i < 3 && <span className={`h-0.5 flex-1 rounded ${i + 1 < step ? "bg-lime" : "bg-hairline"}`} />}
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
          <Field label="Price (₹)" value={s1.price} on={(v) => setS1({ ...s1, price: v })} type="number" min={1} required />
          <Field label="Discounted price (₹, optional)" value={s1.discountedPrice} on={(v) => setS1({ ...s1, discountedPrice: v })} type="number" min={1} />
          <Field label="Total stock" value={s1.totalStock} on={(v) => setS1({ ...s1, totalStock: v })} type="number" min={1} required />
          <Field label="Auto-accept discount %" value={s1.autoAcceptDiscount} on={(v) => setS1({ ...s1, autoAcceptDiscount: v })} type="number" min={0} max={100} />
          <Field label="Max bargain discount %" value={s1.maximumDiscount} on={(v) => setS1({ ...s1, maximumDiscount: v })} type="number" min={0} max={100} />
          {error && <p role="alert" className="text-sm font-medium text-live sm:col-span-2">{error}</p>}
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
            <button onClick={() => { const c = colorInput.trim(); if (c && !colors.some((x) => colorKey(x) === colorKey(c))) setColors([...colors, c]); setColorInput(""); }} className="btn-ink rounded-full px-5 text-sm font-semibold">Add</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-ink">
                {c} <button onClick={() => setColors(colors.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-live">{error}</p>}
          <div className="mt-6 flex gap-3">
            <Back onClick={() => setStep(1)} />
            <button onClick={submitStep2} disabled={busy || colors.length === 0} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
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
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Pick sizes">
                {SIZE_OPTIONS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggleSize(o)}
                    aria-pressed={hasSize(o)}
                    className={`min-w-[3rem] rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${hasSize(o) ? "border-ink bg-ink text-surface" : "border-hairline bg-surface-2 text-ink hover:border-ink"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} placeholder="Or type your own, e.g. 28" className="h-11 flex-1 rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
                <button onClick={() => { addSize(sizeInput); setSizeInput(""); }} className="btn-ink rounded-full px-5 text-sm font-semibold">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((s, i) => <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-ink">{s} <button onClick={() => setSizes(sizes.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button></span>)}
              </div>
            </div>
          )}
          <p className="text-[15px] text-muted">{s1.hasColor ? "Main product images" : "Product images"}</p>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hairline bg-surface-2 py-10 text-muted hover:border-ink">
            <Upload className="h-6 w-6" />
            <span className="text-sm font-medium">{files.length ? `${files.length} image(s) selected` : "Click to choose images"}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          </label>
          {s1.hasColor && colors.map((c) => {
            const picked = colorFiles[colorKey(c)] ?? [];
            return (
              <div key={c} className="mt-5">
                <p className="text-[15px] text-muted">Images for {c}</p>
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hairline bg-surface-2 py-6 text-muted hover:border-ink">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm font-medium">{picked.length ? `${picked.length} image(s) selected` : "Click to choose images"}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setColorFiles({ ...colorFiles, [colorKey(c)]: Array.from(e.target.files ?? []) })} />
                </label>
              </div>
            );
          })}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-live">{error}</p>}
          <div className="mt-6 flex gap-3">
            <Back onClick={() => setStep(s1.hasColor ? 2 : 1)} />
            <button
              onClick={submitStep3}
              disabled={busy || files.length === 0 || (s1.hasSize && sizes.length === 0) || (s1.hasColor && colors.some((c) => (colorFiles[colorKey(c)] ?? []).length === 0))}
              className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <p className="text-[15px] text-muted">How many units of each are in stock? The total can&apos;t be more than the {declared} you entered.</p>
          <div className="mt-3 space-y-2">
            {rows.map((r) => (
              <label key={r.key} className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
                <span className="flex-1 text-[15px] text-ink">{r.label}</span>
                <input
                  type="number" min={0} inputMode="numeric" value={stockOf(r.key)}
                  onChange={(e) => setStock({ ...stock, [r.key]: e.target.value })}
                  aria-label={`Stock for ${r.label}`}
                  className="h-10 w-24 rounded-xl border border-hairline bg-surface px-3 text-right text-[15px] text-ink focus:border-ink focus:outline-none"
                />
              </label>
            ))}
          </div>
          <p className={`mt-3 text-sm font-medium ${allocated > declared ? "text-live" : "text-muted"}`}>{allocated} of {declared} units assigned</p>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-live">{error}</p>}
          <div className="mt-6 flex gap-3">
            <Back onClick={() => setStep(3)} />
            <button onClick={submitStep4} disabled={busy || allocated === 0 || allocated > declared} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Publish product
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, on, type = "text", full, required, min, max }: { label: string; value: string; on: (v: string) => void; type?: string; full?: boolean; required?: boolean; min?: number; max?: number }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input type={type} required={required} min={min} max={max} value={value} onChange={(e) => on(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
    </label>
  );
}
function Next({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button type="submit" disabled={busy} className="pill-lime inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {children}</button>;
}
function Back({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink hover:bg-surface-2"><ArrowLeft className="h-4 w-4" /> Back</button>;
}
