"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Category } from "@/lib/types";

/** Categories live in the nav now, so the home page can lead with video.
 *  Self-fetching (the endpoint is public) so every page's nav gets it. */
export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const list = cats.filter((c) => c.slug !== "explore-all");

  // Same-origin via the Next rewrite (no CORS / cold-start stall), fetched once
  // on mount so the menu is populated the instant it opens.
  useEffect(() => {
    let alive = true;
    fetch("/api/v1/category")
      .then((r) => r.json())
      .then((j) => { if (alive) setCats(j?.categories ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
      >
        Categories
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="card absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[30rem] rounded-[1.25rem] p-3 shadow-xl">
          {list.length === 0 && <p className="px-3 py-4 text-sm text-muted">Loading categories…</p>}
          <div className="grid grid-cols-2 gap-1">
            {list.map((c) => (
              <Link
                key={c._id}
                href={`/category/${encodeURIComponent(c.slug)}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
                  {c.image?.url ? (
                    <Image src={c.image.url} alt="" width={32} height={32} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-semibold text-ink">{c.name[0]}</span>
                  )}
                </span>
                <span className="truncate text-[14px] font-medium text-ink">{c.name}</span>
              </Link>
            ))}
          </div>
          <Link
            href="/shop"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-xl bg-surface-2 px-3 py-2.5 text-center text-[13px] font-semibold text-ink transition-colors hover:bg-canvas"
          >
            Browse everything
          </Link>
        </div>
      )}
    </div>
  );
}

/** Horizontal category links under the nav, the way marketplace headers do it.
 *  Shares the same public /category fetch as the dropdown. */
export function CategoryStrip() {
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/category")
      .then((r) => r.json())
      .then((j) => { if (alive) setCats(j?.categories ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const list = cats.filter((c) => c.slug !== "explore-all");
  if (list.length === 0) return null;

  return (
    <nav
      aria-label="Categories"
      className="mx-auto mt-2 flex max-w-[1400px] gap-1 overflow-x-auto px-2 pb-1 text-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Link href="/live" className="shrink-0 rounded-full px-3 py-1.5 font-medium text-ink transition-colors hover:bg-surface-2">
        Live
      </Link>
      <Link href="/bits" className="shrink-0 rounded-full px-3 py-1.5 font-medium text-ink transition-colors hover:bg-surface-2">
        Videos
      </Link>
      {list.map((c) => (
        <Link
          key={c._id}
          href={`/category/${encodeURIComponent(c.slug)}`}
          className="shrink-0 rounded-full px-3 py-1.5 text-ink transition-colors hover:bg-surface-2"
        >
          {c.name}
        </Link>
      ))}
      <Link href="/sellers" className="shrink-0 rounded-full px-3 py-1.5 text-ink transition-colors hover:bg-surface-2">
        Sellers
      </Link>
    </nav>
  );
}
