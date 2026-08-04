"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal scrolling row with arrow controls, the way marketplace homepages
 *  stack their sections. Scroll-snaps so cards never end up half cut off. */
export function Rail({
  title,
  sub,
  href,
  cta = "See all",
  children,
}: {
  title: string;
  sub?: string;
  href?: string;
  cta?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function sync() {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }
  useEffect(() => { sync(); }, []);

  function nudge(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  }

  return (
    <section className="mt-12 first:mt-0">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="font-display text-[clamp(1.2rem,2.2vw,1.6rem)] font-semibold text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-[14px] text-muted">{sub}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {href && (
            <Link href={href} className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
              {cta}
            </Link>
          )}
          <div className="hidden gap-1.5 sm:flex">
            <Arrow dir="left" onClick={() => nudge(-1)} disabled={atStart} />
            <Arrow dir="right" onClick={() => nudge(1)} disabled={atEnd} />
          </div>
        </div>
      </div>

      <div
        ref={ref}
        onScroll={sync}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-4"
      >
        {children}
      </div>
    </section>
  );
}

function Arrow({ dir, onClick, disabled }: { dir: "left" | "right"; onClick: () => void; disabled: boolean }) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Scroll left" : "Scroll right"}
      className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-surface text-ink transition-opacity hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
