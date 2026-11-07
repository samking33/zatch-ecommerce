"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check, Upload, X } from "lucide-react";
import { getToken } from "@/lib/client-auth";
import { shrinkImages } from "@/lib/shrink-image";
import { ProductMedia } from "@/components/ui/product-media";
import type { Category, Product, ProductImage } from "@/lib/types";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
// The backend model's enum.
const CONDITIONS = ["New", "Like New", "Good", "Fair", "Used"];
// ponytail: the backend sets none of these limits; they only stop obvious typos.
const MAX_PRICE = 1_000_000;
const MAX_DELIVERY_DAYS = 30;
const MAX_PHOTOS = 8;

// The full saved product (from /product/seller/my-products), for editing.
export type EditableProduct = Product & {
  hsn?: string | null; model?: string; condition?: string;
  productType?: { hasColor?: boolean; hasSize?: boolean };
  shipping?: Product["shipping"] & { freeShipping?: boolean; weight?: number; dimensions?: { length?: number; breadth?: number; height?: number } };
};

// Real 4-step create matching the backend: step 1 (basics → productId),
// step 2 (colors), step 3 (multipart images + sizes), step 4 (stock per variant).
// Step 4 is what creates the variants and makes the product active.
//
// Zatch-pickup sellers send step 1 to create-v3, the only create that marks the product
// for Shiprocket pickup and stores its package size (v1 and v2 leave every product
// self-ship, see B-48). Steps 2 to 4 stay on /product/create: v3 takes no image files,
// only URLs from the upload-token endpoint that leaks the storage key (B-41). That is
// safe because v3 step 1 writes the same draft (stepData.step1) and later v1 steps never
// touch `shipping`.
//
// Editing reruns the same steps with the product's id, as the app does: every step updates
// the live product in place and keeps its status, link, likes and reviews. Photos are either
// kept (create-v2 step 3 takes the saved photo objects) or replaced by new uploads (v1 step 3
// uploads on the server, so the storage key is never involved).
export function CreateProduct({ categories, pickup = false, initial }: { categories: Category[]; pickup?: boolean; initial?: EditableProduct }) {
  const router = useRouter();
  const editing = !!initial;
  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState<string | null>(initial?._id ?? null);
  // The category the server's draft was saved with: it refuses to change it on that draft.
  const [savedCategory, setSavedCategory] = useState(initial?.category ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const str = (n?: number | null) => (n == null ? "" : String(n));
  const variants = initial?.variants ?? [];
  const [s1, setS1] = useState({
    category: initial?.category ?? "", subCategory: initial?.subCategory ?? "", name: initial?.name ?? "", description: initial?.description ?? "",
    price: str(initial?.price),
    discountedPrice: initial && initial.discountedPrice != null && initial.discountedPrice < initial.price ? String(initial.discountedPrice) : "",
    totalStock: str(initial?.totalStock), hsn: initial?.hsn ?? "",
    brand: initial?.brand ?? "", model: initial?.model ?? "", condition: initial?.condition ?? "New",
    // Same defaults as the backend model. The server stores COD as false unless it is sent as true.
    freeShipping: initial?.shipping?.freeShipping ?? false, codAvailable: initial?.shipping?.codAvailable ?? true,
    estimatedDeliveryDays: str(initial?.shipping?.estimatedDeliveryDays ?? 7), returnPolicy: initial?.shipping?.returnPolicy ?? "7 days return policy",
    orderAcceptingType: initial?.orderAcceptingType ?? "autoAccept",
    // Colours and sizes are always collected for new products; the backend needs them to build variants.
    hasColor: initial?.productType?.hasColor ?? true, hasSize: initial?.productType?.hasSize ?? true,
    // A product saved without its own bargain range follows the seller's global one, so an edit
    // leaves these empty and doesn't send them.
    autoAcceptDiscount: initial ? str(initial.bargainSettings?.autoAcceptDiscount) : "10",
    maximumDiscount: initial ? str(initial.bargainSettings?.maximumDiscount) : "30",
  });
  // Packed parcel for Shiprocket, pickup sellers only.
  const dims = initial?.shipping?.dimensions;
  const [pkg, setPkg] = useState({ weightKg: str(initial?.shipping?.weight), lengthCm: str(dims?.length), breadthCm: str(dims?.breadth), heightCm: str(dims?.height) });
  const [suggesting, setSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x && x.toLowerCase() !== "none"))];
  const [colors, setColors] = useState<string[]>(uniq(variants.map((v) => v.color)));
  const [colorInput, setColorInput] = useState("");
  const [colorNote, setColorNote] = useState<string | null>(null);
  const [sizes, setSizes] = useState<string[]>(uniq(variants.map((v) => v.size)));
  const [sizeInput, setSizeInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  // Extra images per colour (keyed by lower-cased colour) and stock per variant row.
  const [colorFiles, setColorFiles] = useState<Record<string, File[]>>({});
  const [stock, setStock] = useState<Record<string, string>>(() => Object.fromEntries(variants.map((v) => [
    [v.color?.toLowerCase(), v.size?.toUpperCase()].filter(Boolean).join("|") || "all", String(v.stock),
  ])));
  const [keepPhotos, setKeepPhotos] = useState(editing);
  const [published, setPublished] = useState(false);

  // Until step 4 succeeds a new product is only a draft, and an edit is half saved, so warn before the tab is closed.
  const started = editing ? step > 1 : !!productId;
  useEffect(() => {
    if (!started || published) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [started, published]);

  // The backend uppercases sizes, so compare case-insensitively ("s" and "S" are one size).
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const hasSize = (v: string) => sizes.some((x) => same(x, v));
  // Updater form, so quick successive taps never overwrite each other.
  const addSize = (v: string) => {
    const s = v.trim();
    if (s) setSizes((cur) => (cur.some((x) => same(x, s)) ? cur : [...cur, s]));
    setSizeInput("");
  };
  const toggleSize = (v: string) =>
    setSizes((cur) => (cur.some((x) => same(x, v)) ? cur.filter((x) => !same(x, v)) : [...cur, v]));

  // The backend lower-cases colours and upper-cases sizes, so key everything the same way.
  const colorKey = (c: string) => c.trim().toLowerCase();
  function addColor() {
    const c = colorInput.trim();
    if (!c) return;
    if (colors.some((x) => colorKey(x) === colorKey(c))) { setColorNote(`${c} is already added.`); return; }
    setColors((cur) => [...cur, c]);
    setColorInput(""); setColorNote(null);
  }
  // Enter in a one-line box adds the value instead of doing nothing.
  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); fn(); } };

  // One colour: the main images are that colour's images, so no second upload box.
  const singleColour = s1.hasColor && colors.length === 1;
  const imagesFor = (c: string) => (singleColour ? files : colorFiles[colorKey(c)] ?? []);
  const setColourFiles = (c: string) => (fn: (cur: File[]) => File[]) =>
    setColorFiles((cur) => ({ ...cur, [colorKey(c)]: fn(cur[colorKey(c)] ?? []) }));

  // Saved photos, for keeping them on an edit. Only photos with a storage id can be sent back.
  const clean = (imgs?: ProductImage[]) => (imgs ?? []).filter((i) => i.url && i.public_id).map((i) => ({ url: i.url, public_id: i.public_id }));
  const savedFor = (c: string) => clean(variants.find((v) => v.color && colorKey(v.color) === colorKey(c))?.images);
  const savedMain = clean(initial?.images);
  const canKeep = editing && savedMain.length > 0 && (!s1.hasColor || colors.every((c) => savedFor(c).length > 0));
  const keeping = keepPhotos && canKeep;

  const cat = categories.find((c) => c.slug === s1.category);
  const subs = (cat?.subCategories ?? []) as { name: string; slug: string }[];

  async function postJson(body: unknown, path = "/api/v1/product/create") {
    const t = getToken();
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    }).then((r) => r.json()).catch(() => null);
  }

  const hasBargain = s1.autoAcceptDiscount !== "" || s1.maximumDiscount !== "";
  // The backend quietly clamps a too-high discounted price down to the price, so catch it here.
  function step1Problem(): string | null {
    const price = Number(s1.price);
    const stock = Number(s1.totalStock);
    const auto = Number(s1.autoAcceptDiscount);
    const max = Number(s1.maximumDiscount);
    // The server only checks that a name was sent, so a name of spaces got through.
    if (!s1.name.trim()) return "Enter a product name.";
    if (!(price > 0)) return "Enter a price above 0.";
    if (price > MAX_PRICE) return `The price can't be more than ₹${MAX_PRICE.toLocaleString("en-IN")}.`;
    if (s1.discountedPrice !== "") {
      const d = Number(s1.discountedPrice);
      if (!(d > 0)) return "The discounted price must be above 0.";
      if (d >= price) return "The discounted price must be lower than the price.";
    }
    if (!Number.isInteger(stock) || stock < 1) return "Total stock must be a whole number, 1 or more.";
    if (hasBargain) {
      if (s1.autoAcceptDiscount === "" || s1.maximumDiscount === "") return "Enter both bargain percentages, or leave both empty.";
      if (![auto, max].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return "Bargain percentages must be between 0 and 100.";
      if (auto > max) return "Auto-accept discount can't be higher than the max bargain discount.";
    }
    // Same rule as the backend model; a bad value would otherwise fail the save with a generic error.
    if (s1.hsn.trim() && !/^\d{4,8}$/.test(s1.hsn.trim())) return "HSN code must be 4 to 8 digits.";
    const days = Number(s1.estimatedDeliveryDays);
    if (!Number.isInteger(days) || days < 1 || days > MAX_DELIVERY_DAYS) return `Delivery time must be 1 to ${MAX_DELIVERY_DAYS} days.`;
    // Shiprocket quotes shipping and books the courier from these, so the server requires all four.
    if (pickup && !Object.values(pkg).every((v) => Number(v) > 0)) return "Enter the packed weight and size, all above 0.";
    return null;
  }

  // The backend's predictor suggests a parcel size from the name and category; the seller can still edit it.
  async function suggestPackage() {
    if (!s1.name.trim()) { setSuggestNote("Enter the product name first."); return; }
    setSuggesting(true); setSuggestNote(null);
    const res = await postJson({ productName: s1.name.trim(), category: s1.category }, "/api/v1/product/predict-package");
    setSuggesting(false);
    const p = res?.predicted ? res.package : null;
    if (!p) { setSuggestNote("No suggestion for this product. Enter the size yourself."); return; }
    setPkg({ weightKg: String(p.weightKg), lengthCm: String(p.lengthCm), breadthCm: String(p.breadthCm), heightCm: String(p.heightCm) });
    setSuggestNote("Suggested from similar products. Check it against your packed parcel.");
  }

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    const problem = step1Problem();
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    const res = await postJson({
      // Going back and picking another category must start a new draft: the server refuses to
      // change the category of the one it saved, but replaces it when no id is sent.
      step: "1", productId: editing || s1.category === savedCategory ? productId ?? undefined : undefined,
      category: s1.category, subCategory: s1.subCategory || undefined,
      name: s1.name.trim(), description: s1.description.trim(),
      price: Number(s1.price), discountedPrice: s1.discountedPrice ? Number(s1.discountedPrice) : undefined,
      totalStock: Number(s1.totalStock || 0), hasColor: s1.hasColor, hasSize: s1.hasSize,
      hsn: s1.hsn.trim() || undefined,
      brand: s1.brand.trim() || undefined, model: s1.model.trim() || undefined, condition: s1.condition,
      freeShipping: s1.freeShipping, codAvailable: s1.codAvailable,
      estimatedDeliveryDays: Number(s1.estimatedDeliveryDays), returnPolicy: s1.returnPolicy.trim() || undefined,
      orderAcceptingType: s1.orderAcceptingType,
      ...(hasBargain ? { bargainSettings: { autoAcceptDiscount: Number(s1.autoAcceptDiscount), maximumDiscount: Number(s1.maximumDiscount) } } : {}),
      ...(pickup ? { weightKg: Number(pkg.weightKg), lengthCm: Number(pkg.lengthCm), breadthCm: Number(pkg.breadthCm), heightCm: Number(pkg.heightCm) } : {}),
    }, pickup ? "/api/v3/product/create-v3" : undefined);
    if (!res?.success || !res.productId) {
      setBusy(false);
      setError(res?.message ?? "Couldn't save. Check the fields.");
      return;
    }
    setProductId(res.productId);
    setSavedCategory(s1.category);
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
    let res;
    if (keeping) {
      res = await postJson({
        step: "3", productId, ...(s1.hasSize ? { sizes } : {}), mainImages: savedMain,
        variantImages: s1.hasColor ? Object.fromEntries(colors.map((c) => [colorKey(c), { DEFAULT: savedFor(c) }])) : {},
      }, "/api/v1/product/create-v2");
    } else {
      const fd = new FormData();
      fd.append("step", "3");
      fd.append("productId", productId ?? "");
      if (s1.hasSize) fd.append("sizes", JSON.stringify(sizes));
      files.forEach((f) => fd.append("images", f));
      // Colour images go under variantImages[colour][DEFAULT]; the server reuses them for every size of that colour.
      if (s1.hasColor) colors.forEach((c) => imagesFor(c).forEach((f) => fd.append(`variantImages[${colorKey(c)}][DEFAULT]`, f)));
      res = await fetch("/api/v1/product/create", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd })
        .then((r) => r.json()).catch(() => null);
    }
    setBusy(false);
    if (res?.success) setStep(4); else setError(res?.message ?? "Couldn't upload images. Try fewer or smaller photos.");
  }

  // Why Continue is greyed out on step 3, so the seller isn't left guessing.
  const missingColour = s1.hasColor && !keeping ? colors.find((c) => imagesFor(c).length === 0) : undefined;
  const step3Block =
    s1.hasSize && sizes.length === 0 ? "Pick at least one size."
    : keeping ? null
    : files.length === 0 ? "Add at least one product photo."
    : missingColour ? `Add photos for ${missingColour}.`
    : null;

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
    if (res?.success) { setPublished(true); router.push(`/seller/products?${editing ? "updated" : "added"}=${productId}`); }
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
            {/* No default: a pre-picked category got products saved under the wrong one. */}
            <select required disabled={editing} value={s1.category} onChange={(e) => setS1({ ...s1, category: e.target.value, subCategory: "" })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none disabled:opacity-70">
              <option value="" disabled>Select a category</option>
              {categories.filter((c) => c.slug !== "explore-all").map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
            </select>
            {editing && <span className="mt-1 block text-[12px] text-muted">The category can&apos;t be changed after a product is created.</span>}
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-muted">Sub-category</span>
            {/* Required when the category has any: buyers browse by sub-category, and products without one never show there. */}
            <select required={subs.length > 0} value={s1.subCategory} onChange={(e) => setS1({ ...s1, subCategory: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
              <option value="">{subs.length ? "Select a sub-category" : "None"}</option>
              {subs.map((s) => <option key={s.slug ?? s.name} value={s.slug ?? s.name}>{s.name}</option>)}
            </select>
          </label>
          <Field label="Product name" value={s1.name} on={(v) => setS1({ ...s1, name: v })} full required maxLength={120} />
          <Field label="Description" value={s1.description} on={(v) => setS1({ ...s1, description: v })} full rows={4} maxLength={2000} />
          <Field label="Price (₹)" value={s1.price} on={(v) => setS1({ ...s1, price: v })} type="number" min={1} max={MAX_PRICE} required />
          <Field label="Discounted price (₹, optional)" value={s1.discountedPrice} on={(v) => setS1({ ...s1, discountedPrice: v })} type="number" min={1} max={MAX_PRICE} />
          <Field label="HSN code (optional)" value={s1.hsn} on={(v) => setS1({ ...s1, hsn: v.replace(/\D/g, "").slice(0, 8) })} />
          <Field label="Total stock" value={s1.totalStock} on={(v) => setS1({ ...s1, totalStock: v })} type="number" min={1} required />
          <Field label={`Auto-accept discount %${editing ? " (optional)" : ""}`} value={s1.autoAcceptDiscount} on={(v) => setS1({ ...s1, autoAcceptDiscount: v })} type="number" min={0} max={100} />
          <Field label={`Max bargain discount %${editing ? " (optional)" : ""}`} value={s1.maximumDiscount} on={(v) => setS1({ ...s1, maximumDiscount: v })} type="number" min={0} max={100} />
          <Field label="Brand (optional)" value={s1.brand} on={(v) => setS1({ ...s1, brand: v })} maxLength={60} />
          <Field label="Model (optional)" value={s1.model} on={(v) => setS1({ ...s1, model: v })} maxLength={60} />
          <Select label="Condition" value={s1.condition} on={(v) => setS1({ ...s1, condition: v })} options={CONDITIONS.map((c) => [c, c])} />
          <Select label="Orders" value={s1.orderAcceptingType} on={(v) => setS1({ ...s1, orderAcceptingType: v })} options={[["autoAccept", "Accept automatically"], ["askBeforeAccepting", "Ask me before accepting"]]} />
          <Field label="Delivery time (days)" value={s1.estimatedDeliveryDays} on={(v) => setS1({ ...s1, estimatedDeliveryDays: v })} type="number" min={1} max={MAX_DELIVERY_DAYS} required />
          <Field label="Return policy" value={s1.returnPolicy} on={(v) => setS1({ ...s1, returnPolicy: v })} maxLength={100} />
          <Toggle label="Free shipping" checked={s1.freeShipping} on={(v) => setS1({ ...s1, freeShipping: v })} />
          <Toggle label="Cash on delivery available" checked={s1.codAvailable} on={(v) => setS1({ ...s1, codAvailable: v })} />
          {pickup && (
            <fieldset className="grid gap-4 rounded-2xl border border-hairline p-4 sm:col-span-2 sm:grid-cols-4">
              <legend className="px-1 text-[13px] font-medium text-ink">Packed parcel (Zatch pickup)</legend>
              <p className="text-[13px] text-muted sm:col-span-4">
                Shiprocket prices delivery and books the courier from these, so measure the parcel as packed.
              </p>
              {/* step="any": parcels weigh fractions of a kilo (0.25 kg) and the predictor returns decimals. */}
              <Field label="Weight (kg)" value={pkg.weightKg} on={(v) => setPkg({ ...pkg, weightKg: v })} type="number" step="any" required />
              <Field label="Length (cm)" value={pkg.lengthCm} on={(v) => setPkg({ ...pkg, lengthCm: v })} type="number" step="any" required />
              <Field label="Breadth (cm)" value={pkg.breadthCm} on={(v) => setPkg({ ...pkg, breadthCm: v })} type="number" step="any" required />
              <Field label="Height (cm)" value={pkg.heightCm} on={(v) => setPkg({ ...pkg, heightCm: v })} type="number" step="any" required />
              <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
                <button type="button" onClick={suggestPackage} disabled={suggesting}
                  className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface-2 disabled:opacity-60">
                  {suggesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Suggest a size
                </button>
                {suggestNote && <p role="status" className="text-[13px] text-muted">{suggestNote}</p>}
              </div>
            </fieldset>
          )}
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
            <input value={colorInput} onChange={(e) => { setColorInput(e.target.value); setColorNote(null); }} onKeyDown={onEnter(addColor)} maxLength={30} placeholder="e.g. Black" aria-label="Colour" className="h-11 flex-1 rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
            <button onClick={addColor} className="btn-ink rounded-full px-5 text-sm font-semibold">Add</button>
          </div>
          {colorNote && <p role="status" className="mt-2 text-sm text-muted">{colorNote}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm capitalize text-ink">
                {c} <button onClick={() => setColors(colors.filter((_, j) => j !== i))} aria-label={`Remove ${c}`}><X className="h-3.5 w-3.5" /></button>
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
                <input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} onKeyDown={onEnter(() => addSize(sizeInput))} maxLength={10} placeholder="Or type your own, e.g. 28" aria-label="Size" className="h-11 flex-1 rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
                <button onClick={() => addSize(sizeInput)} className="btn-ink rounded-full px-5 text-sm font-semibold">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((s, i) => <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-ink">{s} <button onClick={() => setSizes(sizes.filter((_, j) => j !== i))} aria-label={`Remove ${s}`}><X className="h-3.5 w-3.5" /></button></span>)}
              </div>
            </div>
          )}

          {canKeep && (
            <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Photos">
              {([[true, "Keep current photos"], [false, "Replace photos"]] as const).map(([v, l]) => (
                <button key={l} type="button" role="radio" aria-checked={keepPhotos === v} onClick={() => setKeepPhotos(v)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${keepPhotos === v ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}>{l}</button>
              ))}
            </div>
          )}
          {editing && !canKeep && <p className="mb-3 text-[13px] text-muted">Add photos for every colour. They replace the product&apos;s current photos.</p>}

          {keeping ? (
            <>
              <SavedPhotos label={s1.hasColor && !singleColour ? "Main product images" : "Product images"} images={savedMain} />
              {s1.hasColor && !singleColour && colors.map((c) => <SavedPhotos key={c} label={`Images for ${c}`} images={savedFor(c)} />)}
            </>
          ) : (
            <>
              <PhotoPicker label={s1.hasColor && !singleColour ? "Main product images" : "Product images"} files={files} set={setFiles} />
              {s1.hasColor && !singleColour && colors.map((c) => (
                <PhotoPicker key={c} label={`Images for ${c}`} files={colorFiles[colorKey(c)] ?? []} set={setColourFiles(c)} />
              ))}
            </>
          )}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-live">{error}</p>}
          <div className="mt-6 flex gap-3">
            <Back onClick={() => setStep(s1.hasColor ? 2 : 1)} />
            <button
              onClick={submitStep3}
              disabled={busy || !!step3Block}
              aria-describedby={step3Block ? "step3-block" : undefined}
              className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
            </button>
          </div>
          {step3Block && <p id="step3-block" className="mt-2 text-center text-[13px] text-muted">{step3Block}</p>}
        </div>
      )}

      {step === 4 && (
        <div>
          <p className="text-[15px] text-muted">
            How many units of each are in stock? The total can&apos;t be more than the {declared} you entered.
            {/* The server drops every variant with 0 stock (B-55), so buyers never see it. */}
            {rows.length > 1 && " Rows left at 0 won't be listed."}
          </p>
          <div className="mt-3 space-y-2">
            {rows.map((r) => (
              <label key={r.key} className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
                <span className="flex-1 text-[15px] capitalize text-ink">{r.label}</span>
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
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {editing ? "Save changes" : "Publish product"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Thumbnails of the chosen photos with remove buttons. Only images are taken (the picker's
// `accept` is just a hint), and each box holds up to MAX_PHOTOS.
function PhotoPicker({ label, files, set }: { label: string; files: File[]; set: (fn: (cur: File[]) => File[]) => void }) {
  const [note, setNote] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [files]);

  async function pick(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const images = picked.filter((f) => f.type.startsWith("image/"));
    const room = Math.max(0, MAX_PHOTOS - files.length);
    setNote(images.length < picked.length ? "Only photos can be added." : images.length > room ? `Up to ${MAX_PHOTOS} photos here.` : null);
    const add = images.slice(0, room);
    if (add.length) { const shrunk = await shrinkImages(add); set((cur) => [...cur, ...shrunk].slice(0, MAX_PHOTOS)); }
  }

  return (
    <div className="mt-5 first:mt-0">
      <p className="text-[15px] text-muted">{label} <span className="text-[13px]">({files.length} of {MAX_PHOTOS})</span></p>
      <div className="mt-2 flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl bg-surface-2">
            {/* A local blob preview, which next/image can't optimise. */}
            <img src={u} alt={`${label}, photo ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" onClick={() => set((cur) => cur.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1} from ${label}`}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-surface">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {files.length < MAX_PHOTOS && (
          <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-hairline bg-surface-2 text-muted hover:border-ink focus-within:border-ink">
            <Upload className="h-5 w-5" />
            <span className="sr-only">Add photos: {label}</span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {note && <p role="alert" className="mt-2 text-sm font-medium text-live">{note}</p>}
    </div>
  );
}
function SavedPhotos({ label, images }: { label: string; images: ProductImage[] }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="text-[15px] text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={img.public_id ?? img.url} className="h-20 w-20 overflow-hidden rounded-xl bg-surface-2">
            <ProductMedia src={img.url} alt={`${label}, photo ${i + 1}`} sizes="80px" className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, on, type = "text", full, required, min, max, step, maxLength, rows }: { label: string; value: string; on: (v: string) => void; type?: string; full?: boolean; required?: boolean; min?: number; max?: number; step?: string; maxLength?: number; rows?: number }) {
  const cls = "mt-1 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none";
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {rows
        ? <textarea rows={rows} required={required} maxLength={maxLength} value={value} onChange={(e) => on(e.target.value)} className={`${cls} py-2.5`} />
        : <input type={type} required={required} min={min} max={max} step={step} maxLength={maxLength} value={value} onChange={(e) => on(e.target.value)} className={`${cls} h-11`} />}
    </label>
  );
}
function Select({ label, value, on, options }: { label: string; value: string; on: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <select value={value} onChange={(e) => on(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
function Toggle({ label, checked, on }: { label: string; checked: boolean; on: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
      <input type="checkbox" checked={checked} onChange={(e) => on(e.target.checked)} className="h-4 w-4 accent-ink" />
      <span className="text-[15px] text-ink">{label}</span>
    </label>
  );
}
function Next({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button type="submit" disabled={busy} className="pill-lime inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {children}</button>;
}
function Back({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink hover:bg-surface-2"><ArrowLeft className="h-4 w-4" /> Back</button>;
}
