import Link from "next/link";
import { Lock } from "lucide-react";

export function SignInRequired({ what }: { what: string }) {
  return (
    <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
        <Lock className="h-5 w-5" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
        Sign in to see {what}
      </h1>
      <p className="mt-2 max-w-sm text-muted">
        It&apos;s saved to your Zatch account.
      </p>
      <Link href="/login" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">
        Sign in
      </Link>
    </div>
  );
}
