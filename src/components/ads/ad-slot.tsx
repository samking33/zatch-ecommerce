"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ads as adsApi, type Ad, type AdPlacement } from "@/lib/api";

/** Fire-and-forget POST that survives the page navigating away (a click opens the ad's link). */
function beacon(path: string, body?: unknown) {
  try {
    fetch(`/api/v1${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* reporting is never worth breaking the page */
  }
}

/**
 * Where an ad leads. External links must be https; the admin checks that too, but a
 * bad value here would otherwise be a `javascript:` link on our page.
 */
function destination(ad: Ad): { href: string; external: boolean } | null {
  const v = encodeURIComponent(ad.redirectValue ?? "");
  switch (ad.redirectType) {
    case "product": return v ? { href: `/product/${v}`, external: false } : null;
    // The category page redirects an id to its slug.
    case "category": return v ? { href: `/category/${v}`, external: false } : null;
    case "bit": return v ? { href: `/bits?bit=${v}`, external: false } : null;
    case "external":
      try {
        const u = new URL(ad.redirectValue ?? "");
        return u.protocol === "https:" ? { href: u.toString(), external: true } : null;
      } catch {
        return null;
      }
    default: return null;
  }
}

/** Counts an impression once, when at least half the ad has actually been on screen. */
function useImpression(adId: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      beacon("/ads/impressions", { adIds: [adId] });
      io.disconnect();
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [adId]);
  return ref;
}

function AdCard({ ad, wide }: { ad: Ad; wide: boolean }) {
  const ref = useImpression(ad._id);
  const to = destination(ad);
  const body = (
    <>
      <div className="relative aspect-[3/1] overflow-hidden rounded-[1.25rem] bg-surface-2">
        <Image src={ad.imageUrl} alt={ad.title} fill sizes="(max-width: 1024px) 100vw, 1200px" className="object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-medium text-surface">Sponsored</span>
      </div>
      {ad.description && <p className="mt-2 line-clamp-1 px-1 text-[13px] text-muted">{ad.description}</p>}
    </>
  );
  const cls = `block shrink-0 snap-start ${wide ? "w-full" : "w-[85%] sm:w-[60%]"}`;

  return (
    <div ref={ref} className={cls}>
      {to ? (
        to.external ? (
          <a href={to.href} target="_blank" rel="noopener noreferrer sponsored" onClick={() => beacon(`/ads/${ad._id}/click`)} className="block">{body}</a>
        ) : (
          <Link href={to.href} onClick={() => beacon(`/ads/${ad._id}/click`)} className="block">{body}</Link>
        )
      ) : (
        body
      )}
    </div>
  );
}

function useAds(placement: AdPlacement) {
  const [list, setList] = useState<Ad[]>([]);
  useEffect(() => {
    let alive = true;
    adsApi.list(placement).then((r) => { if (alive && Array.isArray(r)) setList(r.filter((a) => a?.imageUrl)); });
    return () => { alive = false; };
  }, [placement]);
  return list;
}

/** The ads the admin has scheduled for one placement; renders nothing when there are none. */
export function AdSlot({ placement, className = "" }: { placement: Exclude<AdPlacement, "home_popup">; className?: string }) {
  const list = useAds(placement);
  if (list.length === 0) return null;
  return (
    <section aria-label="Sponsored" className={`flex snap-x snap-mandatory gap-3 overflow-x-auto ${className}`}>
      {list.map((ad) => <AdCard key={ad._id} ad={ad} wide={list.length === 1} />)}
    </section>
  );
}

const POPUP_KEY = "zatch_ad_popup_closed";
const POPUP_QUIET_MS = 24 * 3600_000;

/** The home-page popup ad: one at a time, and quiet for a day once closed or opened. */
export function AdPopup() {
  const list = useAds("home_popup");
  const dialog = useRef<HTMLDialogElement>(null);
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    if (list.length === 0) return;
    let closed: Record<string, number> = {};
    try { closed = JSON.parse(localStorage.getItem(POPUP_KEY) ?? "{}"); } catch { /* storage blocked */ }
    const next = list.find((a) => !(Date.now() - (closed[a._id] ?? 0) < POPUP_QUIET_MS));
    if (!next) return;
    // A moment after the page settles, so it doesn't land on top of the first paint.
    const t = setTimeout(() => { setAd(next); dialog.current?.showModal(); }, 1500);
    return () => clearTimeout(t);
  }, [list]);

  function close() {
    if (ad) {
      try {
        const closed = JSON.parse(localStorage.getItem(POPUP_KEY) ?? "{}");
        localStorage.setItem(POPUP_KEY, JSON.stringify({ ...closed, [ad._id]: Date.now() }));
      } catch { /* storage blocked */ }
    }
    dialog.current?.close();
  }

  return (
    <dialog ref={dialog} onClose={close} aria-label={ad?.title ?? "Offer"}
      // A click on the backdrop lands on the dialog itself, as in the photo viewer.
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[1.75rem] bg-surface p-3 backdrop:bg-ink/50">
      {ad && (
        <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) close(); }}>
          <AdCard ad={ad} wide />
          <button onClick={close} aria-label="Close" autoFocus
            className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-ink/70 text-surface hover:bg-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </dialog>
  );
}
