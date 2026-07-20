"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Heart, ShoppingBag } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function Nav() {
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
      <nav className="card mx-auto flex max-w-[1400px] items-center gap-3 rounded-[1.5rem] px-3 py-2.5 backdrop-blur-xl sm:px-4">
        <Logo className="shrink-0 pl-1" />

        <form
          action="/search"
          className="group relative ml-1 hidden flex-1 items-center md:flex"
          role="search"
        >
          <Search className="pointer-events-none absolute left-5 h-[18px] w-[18px] text-muted" />
          <input
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, sellers, live drops…"
            className="h-12 w-full rounded-full border border-hairline bg-surface-2 pl-12 pr-14 text-[15px] text-ink placeholder:text-muted focus:outline-none focus-visible:border-ink"
            aria-label="Search products"
          />
          <button
            type="submit"
            aria-label="Search"
            className="btn-ink absolute right-1.5 grid h-9 w-9 place-items-center rounded-full"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        <Link
          href="/live"
          className="ml-auto hidden items-center gap-2 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2 sm:flex md:ml-0"
        >
          <span className="live-dot grid h-2 w-2 place-items-center rounded-full bg-live" />
          Live now
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <IconButton href="/wishlist" label="Wishlist" className="hidden sm:grid">
            <Heart className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton href="/cart" label="Cart" badge={2}>
            <ShoppingBag className="h-[18px] w-[18px]" />
          </IconButton>

          <Link
            href="/account"
            className="flex items-center gap-2.5 rounded-full border border-hairline bg-surface-2 py-1 pl-3.5 pr-1 transition-colors hover:bg-canvas"
          >
            <span className="hidden text-sm font-medium text-ink sm:inline">
              Account
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[13px] font-semibold text-surface">
              Z
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

function IconButton({
  href,
  label,
  badge,
  className,
  children,
}: {
  href: string;
  label: string;
  badge?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`relative grid h-11 w-11 place-items-center rounded-full border border-hairline bg-surface text-ink transition-colors hover:bg-surface-2 ${className ?? ""}`}
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-1 text-[11px] font-semibold text-lime-ink">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
