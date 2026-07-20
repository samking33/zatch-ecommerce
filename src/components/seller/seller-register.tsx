"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check, Upload, X } from "lucide-react";
import { getToken } from "@/lib/client-auth";

const DOC_TYPES = [
  { value: "pan", label: "PAN card" },
  { value: "aadhar", label: "Aadhaar" },
  { value: "gst_certificate", label: "GST certificate" },
];

type Doc = { type: string; file: File };

// Real 3-step seller KYC onboarding → POST /user/seller/register (step-based).
// After all steps the account moves to `pending` for admin approval.
export function SellerRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shop, setShop] = useState({ businessName: "", gstin: "" });
  const [docs, setDocs] = useState<Doc[]>([]);
  const [addr, setAddr] = useState({ pickupAddress: "", pinCode: "", state: "", shippingMethod: "self" });
  const [bank, setBank] = useState({ accountHolderName: "", accountNumber: "", ifscCode: "", bankName: "", upiId: "" });

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const t = getToken();
    const fd = new FormData();
    fd.append("step", "1");
    fd.append("businessName", shop.businessName);
    if (shop.gstin) fd.append("gstin", shop.gstin);
    docs.forEach((d) => { fd.append("documents", d.file); fd.append("documentTypes", d.type); });
    const res = await fetch("/api/v1/user/seller/register", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd })
      .then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.success) setStep(2); else setError(res?.message ?? "Couldn't save shop details.");
  }

  async function submitJson(stepNum: number, body: Record<string, unknown>, next: number | "done") {
    setBusy(true); setError(null);
    const t = getToken();
    const res = await fetch("/api/v1/user/seller/register", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ step: String(stepNum), ...body }),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.success) { if (next === "done") { router.push("/seller/dashboard"); router.refresh(); } else setStep(next); }
    else setError(res?.message ?? "Couldn't save. Check the fields.");
  }

  return (
    <div className="card mx-auto max-w-2xl rounded-[2rem] p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        {["Shop & KYC", "Pickup address", "Bank details"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold ${i + 1 <= step ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
            <span className={`hidden text-sm font-medium sm:inline ${i + 1 === step ? "text-ink" : "text-muted"}`}>{label}</span>
            {i < 2 && <span className={`h-0.5 flex-1 rounded ${i + 1 < step ? "bg-lime" : "bg-hairline"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={submitStep1} className="grid gap-4">
          <Field label="Business name" value={shop.businessName} on={(v) => setShop({ ...shop, businessName: v })} required />
          <Field label="GSTIN (optional)" value={shop.gstin} on={(v) => setShop({ ...shop, gstin: v.toUpperCase() })} />
          <div>
            <p className="text-[12px] font-medium text-muted">KYC documents (up to 3)</p>
            <div className="mt-2 space-y-2">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="flex-1 truncate text-sm text-ink">{DOC_TYPES.find((x) => x.value === d.type)?.label}: {d.file.name}</span>
                  <button type="button" onClick={() => setDocs(docs.filter((_, j) => j !== i))}><X className="h-4 w-4 text-muted" /></button>
                </div>
              ))}
              {docs.length < 3 && <AddDoc onAdd={(d) => setDocs([...docs, d])} />}
            </div>
          </div>
          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <button type="submit" disabled={busy} className="pill-lime inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <Field label="Pickup address" value={addr.pickupAddress} on={(v) => setAddr({ ...addr, pickupAddress: v })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pincode" value={addr.pinCode} on={(v) => setAddr({ ...addr, pinCode: v })} />
            <Field label="State" value={addr.state} on={(v) => setAddr({ ...addr, state: v })} />
          </div>
          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <div className="flex gap-3">
            <Back onClick={() => setStep(1)} />
            <button onClick={() => submitJson(2, addr, 3)} disabled={busy} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4">
          <Field label="Account holder name" value={bank.accountHolderName} on={(v) => setBank({ ...bank, accountHolderName: v })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account number" value={bank.accountNumber} on={(v) => setBank({ ...bank, accountNumber: v })} />
            <Field label="IFSC code" value={bank.ifscCode} on={(v) => setBank({ ...bank, ifscCode: v.toUpperCase() })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank name" value={bank.bankName} on={(v) => setBank({ ...bank, bankName: v })} />
            <Field label="UPI ID (optional)" value={bank.upiId} on={(v) => setBank({ ...bank, upiId: v })} />
          </div>
          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <div className="flex gap-3">
            <Back onClick={() => setStep(2)} />
            <button onClick={() => submitJson(3, bank, "done")} disabled={busy} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Submit for approval
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddDoc({ onAdd }: { onAdd: (d: Doc) => void }) {
  const [type, setType] = useState("pan");
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-hairline bg-surface-2 px-3 py-2.5 text-sm text-muted hover:border-ink">
      <select value={type} onChange={(e) => setType(e.target.value)} onClick={(e) => e.preventDefault()} className="rounded-lg border border-hairline bg-surface px-2 py-1 text-[13px] text-ink focus:outline-none">
        {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
      <Upload className="h-4 w-4" /> Add document
      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdd({ type, file: f }); }} />
    </label>
  );
}
function Field({ label, value, on, required }: { label: string; value: string; on: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input required={required} value={value} onChange={(e) => on(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
    </label>
  );
}
function Back({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink hover:bg-surface-2"><ArrowLeft className="h-4 w-4" /> Back</button>;
}
