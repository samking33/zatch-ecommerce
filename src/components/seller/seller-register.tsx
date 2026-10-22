"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check, Upload, X } from "lucide-react";
import { getToken } from "@/lib/client-auth";
import { address as addressApi, ifsc as ifscApi, type SellerProfileDraft } from "@/lib/api";
import { shrinkImage } from "@/lib/shrink-image";

const DOC_TYPES = [
  { value: "pan", label: "PAN card" },
  { value: "aadhar", label: "Aadhaar" },
  { value: "gst_certificate", label: "GST certificate" },
];

type Doc = { type: string; file: File };

// Real 3-step seller KYC onboarding → POST /user/seller/register (step-based).
// After all steps the account moves to `pending` for admin approval.
export function SellerRegister({ draft }: { draft?: SellerProfileDraft }) {
  const router = useRouter();
  // Pick up where the seller left off (the app's "Resume application"); earlier answers are filled in.
  const [step, setStep] = useState(!draft?.businessName ? 1 : !draft.address?.pickupAddress ? 2 : 3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shop, setShop] = useState({ businessName: draft?.businessName ?? "", gstin: draft?.gstin ?? draft?.enrollmentId ?? "", pan: "" });
  const [docs, setDocs] = useState<Doc[]>([]);
  // Same fields as the app's address step. Billing is the pickup address unless unticked.
  const [addr, setAddr] = useState({ line1: draft?.address?.pickupAddress ?? "", line2: "", pinCode: draft?.address?.pinCode ?? "", state: draft?.address?.state ?? "" });
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState({ line1: "", line2: "", pinCode: "", state: "" });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [ifscBank, setIfscBank] = useState<string | null>(null);
  const [tc, setTc] = useState(false);
  const [bank, setBank] = useState({ accountHolderName: "", accountNumber: "", ifscCode: "", bankName: "", upiId: "" });

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const t = getToken();
    const fd = new FormData();
    fd.append("step", "1");
    fd.append("businessName", shop.businessName);
    if (shop.gstin) fd.append("gstin", shop.gstin);
    if (shop.pan) fd.append("pan", shop.pan);
    // "[]" makes the server read this as a list even with a single document.
    docs.forEach((d) => { fd.append("documents", d.file); fd.append("documentTypes[]", d.type); });
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

  function locate() {
    const t = getToken();
    if (!navigator.geolocation || !t) return setError("Your browser can't share your location.");
    setLocating(true); setError(null);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const a = await addressApi.geocode(latitude, longitude, t);
      setLocating(false);
      setCoords({ latitude, longitude });
      if (a) setAddr((x) => ({ ...x, line1: a.line1?.trim() || a.formatted || x.line1, pinCode: a.pincode || x.pinCode, state: a.state || x.state }));
    }, () => { setLocating(false); setError("Location access was blocked. Fill in the address below."); }, { enableHighAccuracy: true, timeout: 10000 });
  }

  function submitAddress() {
    const join = (a: typeof addr) => [a.line1.trim(), a.line2.trim()].filter(Boolean).join(", ");
    const bad = (a: typeof addr, what: string) =>
      !a.line1.trim() ? `${what} address line 1 is required.` : !/^\d{6}$/.test(a.pinCode.trim()) ? `${what} pincode must be 6 digits.` : !a.state.trim() ? `${what} state is required.` : null;
    const problem = bad(addr, "Pickup") ?? (billingSame ? null : bad(billing, "Billing"));
    if (problem) return setError(problem);
    // The server keeps billing as one line, so its pincode and state go into the text.
    const billingAddress = billingSame ? join(addr) : `${join(billing)}, ${billing.state.trim()} ${billing.pinCode.trim()}`;
    submitJson(2, {
      pickupAddress: join(addr), billingAddress, pinCode: addr.pinCode.trim(), state: addr.state.trim(), shippingMethod: "self_ship",
      ...(coords ?? {}),
    }, 3);
  }

  // The app fills the bank name from the IFSC; a code the lookup doesn't know is refused.
  async function checkIfsc(code: string) {
    setIfscBank(null);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) return;
    const res = await ifscApi.lookup(code);
    if (res?.BANK) {
      setIfscBank(`${res.BANK}${res.BRANCH ? `, ${res.BRANCH}` : ""}`);
      setBank((b) => (b.ifscCode === code ? { ...b, bankName: b.bankName || res.BANK! } : b));
    }
  }

  function submitBank() {
    if (!bank.accountHolderName.trim()) return setError("Account holder name is required.");
    if (!/^\d{9,18}$/.test(bank.accountNumber)) return setError("Enter a valid account number (9 to 18 digits).");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifscCode)) return setError("Enter a valid IFSC code, for example HDFC0001234.");
    if (!bank.bankName.trim()) return setError("Bank name is required.");
    submitJson(3, bank, 4);
  }

  return (
    <div className="card mx-auto max-w-2xl rounded-[2rem] p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        {["Shop & KYC", "Address", "Bank", "Submit"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold ${i + 1 <= step ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
            <span className={`hidden text-sm font-medium sm:inline ${i + 1 === step ? "text-ink" : "text-muted"}`}>{label}</span>
            {i < 3 && <span className={`h-0.5 flex-1 rounded ${i + 1 < step ? "bg-lime" : "bg-hairline"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={submitStep1} className="grid gap-4">
          <Field label="Business name" value={shop.businessName} on={(v) => setShop({ ...shop, businessName: v })} required />
          {/* The server checks the format, the GSTIN checksum and that the PAN matches the GSTIN. */}
          <Field label="GSTIN / Enrollment ID (optional)" value={shop.gstin} on={(v) => setShop({ ...shop, gstin: idChars(v, 15) })} />
          <Field label="PAN (optional)" value={shop.pan} on={(v) => setShop({ ...shop, pan: idChars(v, 10) })} />
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
          <button type="button" onClick={locate} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline py-2.5 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-60">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {locating ? "Finding you…" : "Use my current location"}
          </button>
          <Field label="Pickup address line 1" value={addr.line1} on={(v) => setAddr({ ...addr, line1: v })} required />
          <Field label="Address line 2 (optional)" value={addr.line2} on={(v) => setAddr({ ...addr, line2: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pincode" value={addr.pinCode} on={(v) => setAddr({ ...addr, pinCode: v.replace(/\D/g, "").slice(0, 6) })} required />
            <Field label="State" value={addr.state} on={(v) => setAddr({ ...addr, state: v })} required />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
            <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} className="h-4 w-4 accent-ink" />
            <span className="text-[15px] text-ink">Billing address same as pickup address</span>
          </label>
          {!billingSame && (
            <div className="grid gap-4 rounded-2xl border border-hairline p-4">
              <Field label="Billing address line 1" value={billing.line1} on={(v) => setBilling({ ...billing, line1: v })} required />
              <Field label="Address line 2 (optional)" value={billing.line2} on={(v) => setBilling({ ...billing, line2: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pincode" value={billing.pinCode} on={(v) => setBilling({ ...billing, pinCode: v.replace(/\D/g, "").slice(0, 6) })} required />
                <Field label="State" value={billing.state} on={(v) => setBilling({ ...billing, state: v })} required />
              </div>
            </div>
          )}
          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <div className="flex gap-3">
            <Back onClick={() => setStep(1)} />
            <button onClick={submitAddress} disabled={busy} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4">
          <Field label="Account holder name" value={bank.accountHolderName} on={(v) => setBank({ ...bank, accountHolderName: v.replace(/[^a-zA-Z\s.]/g, "") })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account number" value={bank.accountNumber} on={(v) => setBank({ ...bank, accountNumber: v.replace(/\D/g, "").slice(0, 18) })} required />
            <div>
              <Field label="IFSC code" value={bank.ifscCode} on={(v) => { const code = idChars(v, 11); setBank({ ...bank, ifscCode: code }); checkIfsc(code); }} required />
              {ifscBank && <p className="mt-1 text-[12px] text-muted">{ifscBank}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank name" value={bank.bankName} on={(v) => setBank({ ...bank, bankName: v })} />
            <Field label="UPI ID (optional)" value={bank.upiId} on={(v) => setBank({ ...bank, upiId: v })} />
          </div>
          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <div className="flex gap-3">
            <Back onClick={() => setStep(2)} />
            <button onClick={submitBank} disabled={busy} className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4 - accepting T&C is what actually submits the application. */}
      {step === 4 && (
        <div className="grid gap-4">
          <p className="text-[15px] text-muted">
            Last step. Read the seller terms and accept to submit your application for approval.
          </p>
          <Link href="/seller/terms" target="_blank" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline">
            Read seller terms & conditions →
          </Link>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-4">
            <input
              type="checkbox"
              checked={tc}
              onChange={(e) => setTc(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-ink"
            />
            <span className="text-[15px] text-ink">
              I accept the Zatch seller terms & conditions and confirm the details I&apos;ve provided are accurate.
            </span>
          </label>
          {error && <p className="text-sm font-medium text-live">{error}</p>}
          <div className="flex gap-3">
            <Back onClick={() => setStep(3)} />
            <button
              onClick={() => submitJson(4, { tcAccepted: true }, "done")}
              disabled={busy || !tc}
              className="pill-lime inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-50"
            >
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
      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) shrinkImage(f).then((file) => onAdd({ type, file })); }} />
    </label>
  );
}
const idChars = (v: string, max: number) => v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, max);
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
