import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ProductOrb } from "@/components/ui/product-orb";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-[1400px] place-items-center px-3 py-6 sm:px-5">
      <div className="card grid w-full max-w-4xl overflow-hidden rounded-[2rem] md:grid-cols-2">
        {/* brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-8 md:flex">
          <div className="pointer-events-none absolute -right-16 -top-10 h-64 w-64">
            <ProductOrb tone="lime" float />
          </div>
          <Logo className="[&_span:last-child]:text-surface [&_.bg-ink]:bg-surface [&_.bg-ink]:text-ink" />
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

        {/* form */}
        <div className="p-8 sm:p-10">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Welcome back
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Enter your phone to get a one-time code.
          </p>

          <form className="mt-7 space-y-4">
            <label className="block">
              <span className="text-[13px] font-medium text-muted">Phone number</span>
              <div className="mt-1.5 flex items-center rounded-2xl border border-hairline bg-surface-2 focus-within:border-ink">
                <span className="pl-4 pr-2 text-[15px] font-medium text-ink">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  className="h-12 w-full rounded-r-2xl bg-transparent pr-4 text-[15px] text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
            </label>
            <button
              type="submit"
              className="pill-lime w-full rounded-full py-3.5 text-[15px] font-semibold"
            >
              Send code
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            New to Zatch?{" "}
            <Link href="/register" className="font-medium text-ink underline-offset-4 hover:underline">
              Create account
            </Link>
          </p>
          <p className="mt-2 text-center text-[13px] text-muted">
            Selling instead?{" "}
            <Link href="/sell" className="font-medium text-ink underline-offset-4 hover:underline">
              Become a seller
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
