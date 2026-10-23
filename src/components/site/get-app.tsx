"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

// The same store links the backend's deep links use (deepLinkController.js).
export const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.zatch.app";
export const APP_STORE = "https://apps.apple.com/us/app/zatch-live-interactive-shop/id6761607900";

type Store = "android" | "ios";

function deviceStore(): Store | null {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 0)) return "ios";
  return null;
}

// Brand marks from Simple Icons (CC0).
function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}
function PlayMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}

/** Both store buttons, for places that show them to everyone (footer, desktop card). */
export function StoreButtons({ dark = false }: { dark?: boolean }) {
  const cls = `inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 transition-opacity hover:opacity-90 ${dark ? "bg-surface text-ink" : "bg-ink text-surface"}`;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={APP_STORE} target="_blank" rel="noopener noreferrer" className={cls}>
        <AppleMark className="h-5 w-5" />
        <span className="text-left leading-tight"><span className="block text-[10px] opacity-70">Download on the</span><span className="text-[14px] font-semibold">App Store</span></span>
      </a>
      <a href={PLAY_STORE} target="_blank" rel="noopener noreferrer" className={cls}>
        <PlayMark className="h-[18px] w-[18px]" />
        <span className="text-left leading-tight"><span className="block text-[10px] opacity-70">Get it on</span><span className="text-[14px] font-semibold">Google Play</span></span>
      </a>
    </div>
  );
}

const CLOSED_KEY = "zatch_app_prompt_closed_at";
const QUIET_DAYS = 7;

/**
 * The "get the app" prompt: a bottom banner on phones whose button goes to that phone's
 * store, and a corner card with both stores on computers. Closing it hides it for a week.
 * Kept off pages where it would cover what people are doing: checkout (the pay button),
 * live rooms (the chat box) and the seller console.
 */
// `/seller/<user id>` is a public shop, so it keeps the prompt; the rest of /seller is the console.
const HIDDEN_ON = [/^\/checkout/, /^\/live\//, /^\/seller\/(?![0-9a-f]{24}(\/|$))/i];

export function AppPrompt() {
  const path = usePathname();
  const [store, setStore] = useState<Store | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let closedAt = 0;
    try { closedAt = Number(localStorage.getItem(CLOSED_KEY)) || 0; } catch { /* storage blocked */ }
    if (Date.now() - closedAt < QUIET_DAYS * 864e5) return;
    setStore(deviceStore());
    // A moment after the page settles, so it doesn't compete with the first paint.
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setShow(false);
    try { localStorage.setItem(CLOSED_KEY, String(Date.now())); } catch { /* storage blocked */ }
  }

  if (!show || HIDDEN_ON.some((re) => re.test(path))) return null;

  if (store) {
    return (
      <div role="region" aria-label="Get the Zatch app" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[90] flex items-center gap-3 rounded-2xl bg-ink p-3 pr-2 text-surface shadow-2xl">
        <Image src="/zatch-logo.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-tight">Get the Zatch app</p>
          <p className="mt-0.5 text-[12px] leading-tight text-surface/70">Live bargains and instant offers</p>
        </div>
        <a href={store === "ios" ? APP_STORE : PLAY_STORE} className="pill-lime shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold">
          Install
        </a>
        <button onClick={close} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-surface/70 hover:text-surface">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Get the Zatch app" className="fixed bottom-4 left-4 z-[90] w-[min(21rem,calc(100vw-2rem))] rounded-2xl bg-ink p-4 text-surface shadow-2xl">
      <button onClick={close} aria-label="Close" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-surface/70 hover:text-surface">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3 pr-6">
        <Image src="/zatch-logo.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
        <div>
          <p className="text-[14px] font-semibold leading-tight">Zatch is better in the app</p>
          <p className="mt-0.5 text-[12px] leading-tight text-surface/70">Live bargains, instant offers and order alerts.</p>
        </div>
      </div>
      <div className="mt-3">
        <StoreButtons dark />
      </div>
    </div>
  );
}
