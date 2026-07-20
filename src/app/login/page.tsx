"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ProductOrb } from "@/components/ui/product-orb";
import { login } from "@/lib/client-auth";
import { useAuth } from "@/components/auth/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login({ phone: phone.trim(), countryCode, password });
      setUser(user);
      router.push("/account");
      router.refresh(); // re-run server components with the new session cookie
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
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
            <p className="font-display text-3xl font-semibold leading-tight text-surface">
              Shop live.
              <br />
              Name your price.
            </p>
            <p className="mt-3 max-w-xs text-[15px] text-white/60">
              Sign in to save deals, track bargains, and check out in seconds.
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Welcome back
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Sign in with your phone and password.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-[13px] font-medium text-muted">Phone number</span>
              <div className="mt-1.5 flex items-center rounded-2xl border border-hairline bg-surface-2 focus-within:border-ink">
                <input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country code"
                  className="h-12 w-16 rounded-l-2xl bg-transparent pl-4 text-[15px] font-medium text-ink focus:outline-none"
                />
                <span className="h-6 w-px bg-hairline" />
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="h-12 w-full rounded-r-2xl bg-transparent px-3 text-[15px] text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[13px] font-medium text-muted">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 h-12 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
            </label>

            {error && (
              <p className="rounded-xl bg-live/10 px-3.5 py-2.5 text-sm font-medium text-live">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="pill-lime flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-70"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-muted hover:text-ink">
              Forgot password?
            </Link>
            <Link href="/register" className="font-medium text-ink underline-offset-4 hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
