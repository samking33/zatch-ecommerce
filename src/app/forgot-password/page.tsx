"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { forgot } from "@/lib/client-auth";

type Step = "phone" | "otp" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, next: Step) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setStep(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4 py-8">
      <div className="card w-full rounded-[2rem] p-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">Reset password</h1>

        {step === "phone" && (
          <form onSubmit={(e) => { e.preventDefault(); run(() => forgot.sendOtp(phone.trim(), countryCode), "otp"); }} className="mt-5 space-y-4">
            <p className="text-[15px] text-muted">Enter your phone and we&apos;ll text a code.</p>
            <div className="flex items-center rounded-2xl border border-hairline bg-surface-2 focus-within:border-ink">
              <input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} aria-label="Country code" className="h-12 w-16 rounded-l-2xl bg-transparent pl-4 text-[15px] font-medium text-ink focus:outline-none" />
              <span className="h-6 w-px bg-hairline" />
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" className="h-12 w-full rounded-r-2xl bg-transparent px-3 text-[15px] text-ink focus:outline-none" />
            </div>
            <Submit busy={busy}>Send code</Submit>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={(e) => { e.preventDefault(); run(() => forgot.verifyOtp(phone.trim(), countryCode, otp.trim()), "reset"); }} className="mt-5 space-y-4">
            <p className="text-[15px] text-muted">Enter the code sent to {countryCode} {phone}.</p>
            <Input value={otp} onChange={setOtp} placeholder="6-digit code" inputMode="numeric" />
            <Submit busy={busy}>Verify code</Submit>
            <button type="button" onClick={() => setStep("phone")} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" /> Change number</button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={(e) => { e.preventDefault(); if (pw !== pw2) return setError("Passwords don't match."); run(() => forgot.reset(phone.trim(), countryCode, pw, pw2), "done"); }} className="mt-5 space-y-4">
            <p className="text-[15px] text-muted">Choose a new password.</p>
            <Input value={pw} onChange={setPw} placeholder="New password" type="password" />
            <Input value={pw2} onChange={setPw2} placeholder="Confirm password" type="password" />
            <Submit busy={busy}>Reset password</Submit>
          </form>
        )}

        {step === "done" && (
          <div className="mt-5">
            <p className="text-[15px] text-ink">Password updated. You can sign in now.</p>
            <button onClick={() => router.push("/login")} className="pill-lime mt-5 w-full rounded-full py-3.5 text-[15px] font-semibold">Go to sign in</button>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-live/10 px-3.5 py-2.5 text-sm font-medium text-live">{error}</p>}

        {step !== "done" && (
          <p className="mt-6 text-center text-sm text-muted">
            Remembered it? <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </main>
  );
}

function Input({ value, onChange, placeholder, type = "text", inputMode }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string; inputMode?: "numeric" }) {
  return <input type={type} inputMode={inputMode} required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />;
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="pill-lime flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70">
      {busy && <Loader2 className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}
