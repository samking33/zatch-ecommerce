import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Zatch home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <Image
        src="/zatch-logo.png"
        alt="Zatch"
        width={36}
        height={36}
        priority
        className="h-9 w-9 rounded-xl transition-transform duration-300 group-hover:rotate-[-6deg]"
      />
      <span
        className={cn(
          "font-display text-[1.35rem] font-semibold tracking-[-0.04em]",
          light ? "text-surface" : "text-ink",
        )}
      >
        zatch
        <span className="text-lime-deep">.</span>
      </span>
    </Link>
  );
}
