import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Zatch home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-surface transition-transform duration-300 group-hover:rotate-[-8deg]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 4h16L7 20h13"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-[1.35rem] font-semibold tracking-[-0.04em] text-ink">
        zatch
        <span className="text-lime-deep">.</span>
      </span>
    </Link>
  );
}
