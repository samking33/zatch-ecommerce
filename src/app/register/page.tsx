"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ProductOrb } from "@/components/ui/product-orb";
import { register } from "@/lib/client-auth";
import { useAuth } from "@/components/auth/auth-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [f, setF] = useState({ username: "", email: "", countryCode: "+91", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await register({
        username: f.username.trim(),
        phone: f.phone.trim(),
        countryCode: f.countryCode,
        password: f.password,
        email: f.email.trim() || undefined,
      });
      setUser(user);
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create account.");
      setBusy(false);
    }
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
            <Field label="Username" value={f.username} onChange={set("username")} required />
            <Field label="Email (optional)" type="email" value={f.email} onChange={set("email")} />
            <label className="block">
              <span className="text-[13px] font-medium text-muted">Phone number</span>
              <div className="mt-1.5 flex items-center rounded-2xl border border-hairline bg-surface-2 focus-within:border-ink">
                <input value={f.countryCode} onChange={set("countryCode")} aria-label="Country code" className="h-12 w-16 rounded-l-2xl bg-transparent pl-4 text-[15px] font-medium text-ink focus:outline-none" />
                <span className="h-6 w-px bg-hairline" />
                <input type="tel" inputMode="numeric" required value={f.phone} onChange={set("phone")} placeholder="98765 43210" className="h-12 w-full rounded-r-2xl bg-transparent px-3 text-[15px] text-ink placeholder:text-muted focus:outline-none" />
              </div>
            </label>
            <Field label="Password" type="password" value={f.password} onChange={set("password")} required />

            {error && <p className="rounded-xl bg-live/10 px-3.5 py-2.5 text-sm font-medium text-live">{error}</p>}

            <button type="submit" disabled={busy} className="pill-lime flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Creating…" : "Create account"}
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

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <input type={type} required={required} value={value} onChange={onChange} className="mt-1.5 h-12 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />
    </label>
  );
}
