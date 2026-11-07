"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Heart, ShoppingBag, Store, Bell } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { CategoryMenu, CategoryStrip } from "./category-menu";
import { useAuth } from "@/components/auth/auth-provider";
import { cart as cartApi, notifications as notifApi, seller as sellerApi, CART_CHANGED } from "@/lib/api";
import { getToken, isSellerStatus } from "@/lib/client-auth";
import { onEvent } from "@/lib/socket";

// The category strip is for browsing. Account, cart, checkout, seller and legal pages stay uncluttered.
const BROWSE_EXACT = ["/", "/shop", "/trending", "/bits", "/live", "/sellers", "/search"];
const BROWSE_PREFIX = ["/category/", "/product/"];

export function Nav() {
  const pathname = usePathname();
  const showStrip = BROWSE_EXACT.includes(pathname) || BROWSE_PREFIX.some((p) => pathname.startsWith(p));
  const [q, setQ] = useState("");
  const { user } = useAuth();
  const label = user?.username || (user ? "Account" : "Sign in");
  const initial = (user?.username?.[0] ?? "Z").toUpperCase();

  // Real cart count + unread notifications for the badges (0 → no badge).
  const [cartCount, setCartCount] = useState(0);
  const [unread, setUnread] = useState(0);
  // null until known, so a seller doesn't see "Sell" flash before "Dashboard".
  const [isSeller, setIsSeller] = useState<boolean | null>(null);
  useEffect(() => {
    const t = getToken();
    if (!t) { setCartCount(0); setUnread(0); setIsSeller(false); return; }
    // Read live, so someone approved after they signed in still gets their dashboard link.
    sellerApi.status(t).then((s) => setIsSeller(isSellerStatus(s?.sellerStatus)));
    const loadCart = () => cartApi.get(t).then((c) => {
      const cart = c as { totalItems?: number; items?: unknown[] } | null;
      setCartCount(cart?.totalItems ?? cart?.items?.length ?? 0);
    });
    loadCart();
    window.addEventListener(CART_CHANGED, loadCart);
    const loadUnread = () =>
      notifApi.unreadCount(t).then((r) => setUnread((r as { unreadCount?: number })?.unreadCount ?? 0));
    loadUnread();
    // A new notification arrives over the socket - bump the badge live.
    const off = onEvent("new_notification", loadUnread);
    return () => { off(); window.removeEventListener(CART_CHANGED, loadCart); };
  }, [user]);

  return (
    <>
    <header className="sticky top-0 z-50 px-3 pb-3 pt-3 sm:px-5 sm:pt-5">
      {/* frosted backdrop that masks content scrolling under the floating pill */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-canvas/90 via-canvas/60 to-transparent backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black,black_60%,transparent)]"
      />
      <nav className="card mx-auto flex max-w-[1400px] items-center gap-2 rounded-[1.5rem] px-3 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-4">
        <Logo compact className="shrink-0 pl-1" />
        <CategoryMenu />

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
            className="h-12 w-full rounded-full border border-hairline bg-surface-2 pl-12 pr-14 text-[15px] text-ink placeholder:text-muted focus-visible:border-ink"
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
          href={isSeller ? "/seller/dashboard" : "/sell"}
          aria-hidden={isSeller === null || undefined}
          className={`ml-auto hidden items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90 sm:flex md:ml-0 ${isSeller === null ? "invisible" : ""}`}
        >
          <Store className="h-4 w-4" />
          {isSeller ? "Dashboard" : "Sell"}
        </Link>

        <div className="ml-auto flex items-center gap-1 min-[360px]:gap-1.5 sm:ml-0 sm:gap-2">
          {/* The search bar above is md+ only; give smaller screens a way in. */}
          <IconButton href="/search" label="Search" className="md:hidden">
            <Search className="h-[18px] w-[18px]" />
          </IconButton>
          {isSeller && (
            <IconButton href="/seller/dashboard" label="Seller dashboard" className="sm:hidden">
              <Store className="h-[18px] w-[18px]" />
            </IconButton>
          )}
          {/* Shown on phones too: counter-offers and order updates arrive here (the app's header has it). */}
          <IconButton href="/notifications" label={unread ? `Notifications, ${unread} unread` : "Notifications"} badge={unread || undefined} className={user ? "" : "hidden sm:grid"}>
            <Bell className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton href="/wishlist" label="Saved & liked" className="hidden sm:grid">
            <Heart className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton href="/cart" label={cartCount ? `Cart, ${cartCount} items` : "Cart"} badge={cartCount || undefined}>
            <ShoppingBag className="h-[18px] w-[18px]" />
          </IconButton>

          <Link
            href={user ? "/account" : "/login"}
            className="flex items-center gap-2.5 rounded-full border border-hairline bg-surface-2 py-1 pl-1 pr-1 transition-colors hover:bg-canvas sm:pl-3.5"
          >
            <span className="hidden max-w-[7rem] truncate text-sm font-medium text-ink sm:inline">
              {label}
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[13px] font-semibold text-surface">
              {initial}
            </span>
          </Link>
        </div>
      </nav>
    </header>
    {/* Outside the sticky header so it scrolls away: pinned, it covered product titles and
        prices, and it painted over the Categories dropdown. */}
    {showStrip && <div className="px-3 sm:px-5"><CategoryStrip /></div>}
    </>
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
        <span aria-hidden className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-1 text-[11px] font-semibold text-lime-ink">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
