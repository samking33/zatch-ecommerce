"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ProductOrb } from "@/components/ui/product-orb";
import { register, otp as otpApi, verifyPhone, afterSignIn, USERNAME_MAX } from "@/lib/client-auth";
import { useAuth } from "@/components/auth/auth-provider";

const GENDERS = ["Male", "Female", "Other"] as const;

// Same steps as the app: details, then the SMS code sent to the phone, then the account is created.
export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [f, setF] = useState({ username: "", email: "", countryCode: "+91", phone: "", password: "" });
  const [gender, setGender] = useState<(typeof GENDERS)[number] | "">("");
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const phone = f.phone.replace(/\D/g, "");

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function sendCode() {
    await otpApi.send(phone, f.countryCode);
    setCodeSent(true);
    setWait(30);
  }

  // A code works once: if account creation fails after it was accepted, a retry must not check it again.
  const verified = useRef<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!codeSent) {
      if (!gender) return setError("Choose your gender.");
      if (phone.length !== 10) return setError("Enter a valid 10-digit mobile number.");
      if (f.password.length < 6) return setError("Password must be at least 6 characters.");
      if (!agreed) return setError("Accept the terms to continue.");
    }
    setBusy(true);
    try {
      if (!codeSent) {
        await sendCode();
        setBusy(false);
        return;
      }
      const pair = `${f.countryCode}${phone}:${code.trim()}`;
      if (verified.current !== pair) {
        await verifyPhone(phone, f.countryCode, code.trim());
        verified.current = pair;
      }
      const user = await register({
        username: f.username.trim(),
        phone,
        countryCode: f.countryCode,
        password: f.password,
        email: f.email.trim(),
        gender: gender || undefined,
      });
      setUser(user);
      router.push(afterSignIn(user));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create account.");
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try { await sendCode(); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't send the code."); }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-[1400px] place-items-center px-3 py-6 sm:px-5">
      <div className="card grid w-full max-w-4xl overflow-hidden rounded-[2rem] md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-8 md:flex">
          <div className="pointer-events-none absolute -right-16 -top-10 h-64 w-64">
            <ProductOrb tone="lime" float />
          </div>
          <Logo light />
          <div className="relative">
            <p className="font-display text-3xl font-semibold leading-tight text-surface">Join the bargain.</p>
            <p className="mt-3 max-w-xs text-[15px] text-white/60">
              Create an account to save deals, make offers, and check out fast.
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <h1 className="font-display text-2xl font-semibold text-ink">Create account</h1>
          <p className="mt-1 text-[15px] text-muted">It takes a few seconds.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {codeSent ? (
              <>
                <p className="text-[15px] text-muted">
                  We sent a code to {f.countryCode} {phone}.{" "}
                  <button type="button" onClick={() => { setCodeSent(false); setCode(""); }} className="font-medium text-ink underline-offset-4 hover:underline">Change details</button>
                </p>
                <label className="block">
                  <span className="text-[13px] font-medium text-muted">Verification code</span>
                  <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" autoComplete="one-time-code" autoFocus
                    className="mt-1.5 h-12 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-[15px] tracking-[0.3em] text-ink focus:border-ink focus:outline-none" />
                </label>
                <button type="button" onClick={resend} disabled={wait > 0} className="text-sm font-medium text-ink disabled:text-muted">
                  {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                </button>
              </>
            ) : (
              <>
                <Field label="Username" value={f.username} onChange={set("username")} required maxLength={USERNAME_MAX} />
                <fieldset>
                  <legend className="text-[13px] font-medium text-muted">Gender</legend>
                  <div className="mt-1.5 flex gap-2">
                    {GENDERS.map((g) => (
                      <button key={g} type="button" onClick={() => setGender(g)} aria-pressed={gender === g}
                        className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${gender === g ? "border-ink bg-ink text-surface" : "border-hairline bg-surface-2 text-ink hover:border-ink"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Field label="Email" type="email" value={f.email} onChange={set("email")} required />
                <label className="block">
                  <span className="text-[13px] font-medium text-muted">Phone number</span>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-hairline bg-surface-2 focus-within:border-ink">
                    <input value={f.countryCode} onChange={set("countryCode")} aria-label="Country code" className="h-12 w-16 rounded-l-2xl bg-transparent pl-4 text-[15px] font-medium text-ink focus:outline-none" />
                    <span className="h-6 w-px bg-hairline" />
                    <input type="tel" inputMode="numeric" required value={f.phone} onChange={set("phone")} placeholder="98765 43210" aria-label="Phone number" className="h-12 w-full rounded-r-2xl bg-transparent px-3 text-[15px] text-ink placeholder:text-muted focus:outline-none" />
                  </div>
                </label>
                <Field label="Password (6+ characters)" type="password" value={f.password} onChange={set("password")} required />
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" />
                  <span>
                    I agree to the <Link href="/terms" target="_blank" className="font-medium text-ink underline-offset-4 hover:underline">Terms</Link> and{" "}
                    <Link href="/privacy" target="_blank" className="font-medium text-ink underline-offset-4 hover:underline">Privacy Policy</Link>, and to get emails from Zatch.
                  </span>
                </label>
              </>
            )}

            {error && <p role="alert" className="rounded-xl bg-live/10 px-3.5 py-2.5 text-sm font-medium text-live">{error}</p>}

            <button type="submit" disabled={busy} className="pill-lime flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Please wait…" : codeSent ? "Verify & create account" : "Send verification code"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required, maxLength }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; maxLength?: number }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <input type={type} required={required} maxLength={maxLength} value={value} onChange={onChange} className="mt-1.5 h-12 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />
    </label>
  );
}
