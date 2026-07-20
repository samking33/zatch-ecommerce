import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "./page-shell";
import { ProductOrb } from "@/components/ui/product-orb";

// Honest placeholder for routes that are mapped in ARCHITECTURE.md and wired
// into nav, but not yet built out. Keeps the app navigable without faking depth.
export function ComingSoon({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <PageShell>
      <div className="card relative mt-6 grid place-items-center overflow-hidden rounded-[2rem] px-6 py-24 text-center">
        <div className="pointer-events-none absolute -top-10 h-56 w-56 opacity-70">
          <ProductOrb tone="lime" float />
        </div>
        <div className="relative">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted">
            In build
          </p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-ink">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
            {note ??
              "This screen is mapped to a live backend endpoint and coming next in the build."}
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
