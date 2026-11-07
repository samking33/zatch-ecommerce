"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, Tag, Boxes, Ticket, Wallet, Radio, Play, FileText, Settings } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";

const tabs = [
  ["Overview", "/seller/dashboard", LayoutGrid],
  ["Orders", "/seller/orders", Package],
  ["Bargains", "/seller/bargains", Tag],
  ["Products", "/seller/products", Boxes],
  ["Bits", "/seller/bits", Play],
  ["Coupons", "/seller/coupons", Ticket],
  ["Payouts", "/seller/payouts", Wallet],
  ["Live", "/seller/live", Radio],
  ["Settings", "/seller/settings", Settings],
  ["Terms", "/seller/terms", FileText],
] as const;

export function SellerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1} className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        {/* seller sub-nav: one scrolling row on wider screens; on phones every tab shows, as a
            5-column grid, instead of 3 of 10 with the rest hidden off to the right. */}
        <nav aria-label="Seller dashboard" className="card mb-4 grid grid-cols-5 gap-1 rounded-[1.5rem] p-1.5 sm:flex sm:overflow-x-auto sm:rounded-full">
          {tabs.map(([label, href, Icon]) => {
            const active = path === href || (href !== "/seller/dashboard" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-2.5 sm:text-sm ${
                  active ? "bg-ink text-surface" : "text-ink hover:bg-surface-2"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        {children}
      </main>
      <Footer />
    </>
  );
}

export function SellerHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4 px-1">
      <div>
        <h1 className="font-display text-[clamp(1.7rem,3vw,2.4rem)] font-semibold text-ink">{title}</h1>
        {sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, sub, cta }: { title: string; sub?: string; cta?: React.ReactNode }) {
  return (
    <div className="card grid place-items-center rounded-[2rem] px-6 py-16 text-center">
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      {sub && <p className="mt-2 text-muted">{sub}</p>}
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}
