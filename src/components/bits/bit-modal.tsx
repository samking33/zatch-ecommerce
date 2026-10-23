"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Heart, MessageCircle, Share2, Bookmark, Send, ShoppingBag, Check, Loader2,
  ChevronUp, ChevronDown, Volume2, VolumeX, Play,
} from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { Avatar } from "@/components/ui/avatar";
import { bits as bitsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { compact, inr } from "@/lib/utils";
import type { Bit, BitComment } from "@/lib/types";

type FreshComment = {
  _id?: string; text: string; timestamp?: string;
  user?: { _id: string; username?: string; profilePicture?: { url?: string }; profilePic?: { url?: string } };
};

function videoUrl(b: Bit) {
  if (!b.video) return undefined;
  return typeof b.video === "string" ? b.video : b.video.url;
}

/**
 * Reel player, moved the way Instagram's is: the reel follows the finger and a release
 * goes exactly one reel up or down (or back), however hard the flick. Desktop: one wheel
 * or trackpad gesture per reel, arrow keys, or the on-screen up/down controls.
 * Callers may pass a single bit or the list plus a starting index.
 */
export function BitModal({
  bit,
  bits,
  index = 0,
  onClose,
}: {
  bit?: Bit;
  bits?: Bit[];
  index?: number;
  onClose: () => void;
}) {
  const list = bits?.length ? bits : bit ? [bit] : [];
  const [i, setI] = useState(() => {
    if (bits?.length && bit) {
      const found = bits.findIndex((b) => b._id === bit._id);
      return found >= 0 ? found : index;
    }
    return index;
  });
  // Sound is tried on; a browser that blocks it turns it off for the whole feed until the viewer taps the speaker.
  const [muted, setMuted] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const last = list.length - 1;

  const canPrev = i > 0;
  const canNext = i < last;
  const go = useCallback((dir: 1 | -1) => setI((n) => Math.min(Math.max(n + dir, 0), last)), [last]);

  // The stack of reels is moved with a transform; `offset` is the finger's pull in pixels.
  const opened = useRef(false);
  const place = useCallback((offset: number, animate: boolean) => {
    const el = track.current;
    if (!el) return;
    el.style.transition = animate ? "transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
    el.style.transform = `translate3d(0, calc(${-i * 100}dvh + ${offset}px), 0)`;
  }, [i]);
  // Settle on the current reel; opening jumps straight to the chosen one.
  useEffect(() => { place(0, opened.current); opened.current = true; }, [place]);

  // Freeze the page behind, so no swipe ever scrolls it.
  useEffect(() => {
    const { documentElement: html, body } = document;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = body.style.overflow = "hidden";
    return () => { [html.style.overflow, body.style.overflow] = prev; };
  }, []);

  // Touch: follow the finger, then one reel per release. Native listeners, because React's touchmove
  // is passive and can't stop the browser from bouncing or scrolling. Panels (comments, products) keep their own scroll.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let drag: { x: number; y: number; t: number; dy: number; axis: "x" | "y" | null } | null = null;
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1 || (e.target as HTMLElement).closest("[data-no-swipe]")) { drag = null; return; }
      drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), dy: 0, axis: null };
    };
    const move = (e: TouchEvent) => {
      if (!drag) return;
      const dx = e.touches[0].clientX - drag.x;
      const dy = e.touches[0].clientY - drag.y;
      if (!drag.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        drag.axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
      }
      if (drag.axis !== "y") return;
      e.preventDefault();
      // Pulling past the first or last reel gives way, then resists.
      drag.dy = (i === 0 && dy > 0) || (i === last && dy < 0) ? dy / 3 : dy;
      place(drag.dy, false);
    };
    const end = () => {
      if (!drag || drag.axis !== "y") { drag = null; return; }
      const { dy, t } = drag;
      drag = null;
      const speed = dy / Math.max(1, performance.now() - t); // px per ms
      const far = Math.abs(dy) > window.innerHeight * 0.15;
      if ((dy < 0 && (far || speed < -0.35)) && i < last) setI(i + 1);
      else if ((dy > 0 && (far || speed > 0.35)) && i > 0) setI(i - 1);
      else place(0, true);
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, [i, last, place]);

  // Wheel and trackpad: one reel per gesture. A trackpad keeps sending wheel events while it coasts,
  // so the next reel waits until the events have stopped for a moment, and never comes within half a
  // second of the last one (a busy page can stall the events long enough to look like a new gesture).
  const wheel = useRef<{ busy: boolean; at: number; timer?: ReturnType<typeof setTimeout> }>({ busy: false, at: 0 });
  function onWheel(e: React.WheelEvent) {
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    const w = wheel.current;
    clearTimeout(w.timer);
    w.timer = setTimeout(() => { w.busy = false; }, 220);
    if (w.busy || Math.abs(e.deltaY) < 12 || performance.now() - w.at < 500) return;
    w.busy = true;
    w.at = performance.now();
    go(e.deltaY > 0 ? 1 : -1);
  }

  // Keyboard: up/down to move, escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      // Typing a comment must not move the feed ("ok" would jump back a reel).
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (list.length === 0) return null;

  return (
    <div ref={root} onWheel={onWheel} className="fixed inset-0 z-[100] overflow-hidden overscroll-none bg-ink/85 backdrop-blur-sm">
      <div ref={track} className="will-change-transform">
        {list.map((b, j) => (
          <div key={b._id} onClick={onClose} className="flex h-[100dvh] items-center justify-center md:p-3">
            <div className="relative flex h-full w-full max-w-5xl justify-center gap-3 md:h-[92vh]" onClick={(e) => e.stopPropagation()}>
              {/* Only this video and its neighbours are loaded, so a swipe shows the next one at once. */}
              {Math.abs(j - i) <= 1 ? (
                <BitPane bit={b} active={j === i} muted={muted} onMuted={setMuted} onClose={onClose} />
              ) : (
                <div className="flex-1 bg-black md:aspect-[9/16] md:flex-none md:rounded-[1.75rem]" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Up/down, outside the card like a feed control */}
      {list.length > 1 && (
        <div className="fixed right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
          <NavBtn onClick={() => go(-1)} disabled={!canPrev} label="Previous video">
            <ChevronUp className="h-5 w-5" />
          </NavBtn>
          <NavBtn onClick={() => go(1)} disabled={!canNext} label="Next video">
            <ChevronDown className="h-5 w-5" />
          </NavBtn>
          <span className="mt-1 text-center text-[11px] font-medium text-white/60">
            {i + 1}/{list.length}
          </span>
        </div>
      )}
    </div>
  );
}

function NavBtn({
  onClick, disabled, label, children,
}: { onClick: () => void; disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** One video plus its social rail and shop panel. */
function BitPane({ bit, active, muted, onMuted, onClose }: { bit: Bit; active: boolean; muted: boolean; onMuted: (m: boolean) => void; onClose: () => void }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(true);

  // Play only the video on screen. If the browser refuses sound, play muted and leave the speaker button to turn it on.
  const onScreen = useRef(active);
  useEffect(() => {
    onScreen.current = active;
    const v = video.current;
    if (!v) return;
    if (!active) { v.pause(); return; }
    v.muted = muted;
    // Only a real refusal counts: a reel swiped past while starting rejects too (AbortError), and must stay stopped.
    const refused = (e: unknown) => (e as DOMException)?.name === "NotAllowedError" && onScreen.current;
    // Refused even muted (an iPhone in Low Power Mode): show the play button so a tap starts it.
    const stuck = () => { setPaused(true); setBuffering(false); };
    v.play().catch((e) => {
      if (!refused(e)) return;
      if (v.muted) return stuck();
      onMuted(true);
      v.muted = true;
      v.play().catch((e2) => { if (refused(e2)) stuck(); });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when this video comes on or off screen
  }, [active]);
  useEffect(() => { if (video.current) video.current.muted = muted; }, [muted]);

  function togglePlay() {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }

  const [liked, setLiked] = useState(!!bit.isLiked);
  const [likes, setLikes] = useState(bit.likeCount ?? 0);
  const [saved, setSaved] = useState(!!bit.isSaved);
  const [comments, setComments] = useState<BitComment[]>(bit.comments ?? []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState(false);
  // Side panel: products or comments. On phones it opens as a sheet over the video.
  const [panel, setPanel] = useState<"products" | "comments" | null>(null);
  const showComments = panel === "comments";
  const [shared, setShared] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Watch data for the view log, the same fields the app sends (reel_watch_tracker.dart).
  // Without them the server records every web view as 0% watched on "android".
  // Length and sound are kept here as it plays: the video element is gone by the time the view is sent.
  const watch = useRef({ watchedMs: 0, lastT: 0, durationMs: 0, soundOn: false, pauseCount: 0, replayCount: 0, liked: false, shared: false, tapped: null as string | null });
  useEffect(() => {
    const w = watch.current;
    Object.assign(w, { watchedMs: 0, lastT: 0, durationMs: 0, soundOn: false, pauseCount: 0, replayCount: 0, liked: false, shared: false, tapped: null });
    let sent = false;
    const send = () => {
      const t = getToken();
      const totalDurationMs = w.durationMs;
      if (sent || !t || (w.watchedMs <= 0 && totalDurationMs <= 0)) return;
      sent = true;
      // keepalive lets the request finish when the tab is closing.
      fetch(`/api/v1/bits/${bit._id}/view`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          watchedMs: Math.round(w.watchedMs), totalDurationMs, pauseCount: w.pauseCount, replayCount: w.replayCount,
          soundOn: w.soundOn, likedDuringWatch: w.liked, sharedDuringWatch: w.shared,
          tappedProduct: w.tapped, scrolledToProduct: !!w.tapped, deviceType: "web", source: "feed",
        }),
      }).catch(() => {});
    };
    window.addEventListener("pagehide", send);
    return () => { window.removeEventListener("pagehide", send); send(); };
  }, [bit._id]);

  function onTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const w = watch.current;
    const v = e.currentTarget;
    const now = v.currentTime;
    if (Number.isFinite(v.duration)) w.durationMs = Math.round(v.duration * 1000);
    w.soundOn = !v.muted && v.volume > 0;
    const step = now - w.lastT;
    if (step > 0 && step < 1.5) w.watchedMs += step * 1000; // seeks don't count as watching
    else if (step < -1 && w.lastT > e.currentTarget.duration - 1.5) w.replayCount += 1; // looped back to the start
    w.lastT = now;
  }

  // The feed the Bit came from can be minutes old (like count, your like, comments), so
  // read this Bit again when it opens. Otherwise "like" can undo a like you already made.
  useEffect(() => {
    const t = getToken();
    if (!t) return;
    bitsApi.get(bit._id, t).then((fresh) => {
      if (!fresh) return;
      setLiked(!!fresh.isLiked);
      setLikes(fresh.likeCount ?? 0);
      setSaved(!!fresh.isSaved);
      if (fresh.comments) {
        // The single-Bit endpoint sends { user: { profilePicture }, timestamp } and no comment id.
        setComments((fresh.comments as unknown as FreshComment[]).map((c, i) => ({
          _id: c._id ?? `${i}-${c.timestamp ?? ""}`,
          text: c.text,
          createdAt: c.timestamp,
          user: c.user && { _id: c.user._id, username: c.user.username, profilePic: c.user.profilePicture ?? c.user.profilePic },
        })));
      }
    }).catch(() => {});
  }, [bit._id]);

  useEffect(() => {
    if (showComments) feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [comments, showComments]);

  function requireAuth(): string | null {
    const t = getToken();
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function toggleLike() {
    const t = requireAuth(); if (!t) return;
    const next = !liked;
    if (next) watch.current.liked = true;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    const res = await bitsApi.toggleLike(bit._id, t);
    if (!res) { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); }
  }

  async function toggleSave() {
    const t = requireAuth(); if (!t) return;
    setSaved((s) => !s);
    const res = await bitsApi.save(bit._id, t);
    if (!res) setSaved((s) => !s);
  }

  async function share() {
    watch.current.shared = true;
    const url = `${window.location.origin}/bits?bit=${bit._id}`;
    try {
      if (navigator.share) await navigator.share({ title: bit.title ?? "Zatch video", url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* dismissed */ }
    bitsApi.share(bit._id, getToken()).catch(() => {});
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    const t = requireAuth(); if (!t || !text.trim()) return;
    const body = text.trim();
    setText(""); setSending(true); setCommentError(false);
    const res = (await bitsApi.comment(bit._id, { text: body }, t)) as
      | { comment?: BitComment; comments?: BitComment[] } | null;
    setSending(false);
    if (res?.comments) setComments(res.comments);
    // The server returns the new comment without the author, so label it as the viewer's own.
    else if (res?.comment) setComments((c) => [...c, { ...res.comment!, user: res.comment!.user ?? { _id: "me", username: "You" } }]);
    else { setText(body); setCommentError(true); }
  }

  const products = bit.products ?? [];
  const src = videoUrl(bit);

  return (
    <>
      {/* Full screen on phones; a 9:16 card on larger screens. */}
      <div className="relative flex-1 overflow-hidden bg-black md:aspect-[9/16] md:flex-none md:rounded-[1.75rem]">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink backdrop-blur">
          <X className="h-4 w-4" />
        </button>

        {src ? (
          <>
            {/* No native controls: on phones they cover the title, the close button and the action rail. */}
            <video
              ref={video}
              key={bit._id}
              onClick={togglePlay}
              onTimeUpdate={onTimeUpdate}
              onPlay={() => setPaused(false)}
              onPause={(e) => { setPaused(true); if (active && !e.currentTarget.ended) watch.current.pauseCount += 1; }}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              src={src}
              poster={bit.thumbnail?.url}
              muted={muted}
              loop
              playsInline
              preload={active ? "auto" : "metadata"}
              className="h-full w-full cursor-pointer bg-black object-cover md:object-contain"
            />
            <button
              onClick={() => onMuted(!muted)}
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
              className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {active && paused && !buffering && (
              <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </span>
            )}
            {active && buffering && (
              <Loader2 className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/80" />
            )}
          </>
        ) : (
          <div className="h-full w-full">
            <ProductMedia src={bit.thumbnail?.url} alt={bit.title ?? "Video"} className="h-full w-full" />
          </div>
        )}

        <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-4">
          <Rail onClick={toggleLike} label={compact(likes)} active={liked}>
            <Heart className={`h-6 w-6 ${liked ? "fill-live text-live" : ""}`} />
          </Rail>
          {/* Products sit in the side panel on larger screens; phones open them from here. */}
          <span className="md:hidden">
            <Rail onClick={() => setPanel((p) => (p === "products" ? null : "products"))} label={products.length ? `Shop ${products.length}` : "Shop"} active={panel === "products"}>
              <ShoppingBag className="h-6 w-6" />
            </Rail>
          </span>
          <Rail onClick={() => setPanel((p) => (p === "comments" ? null : "comments"))} label={compact(comments.length)} active={showComments}>
            <MessageCircle className="h-6 w-6" />
          </Rail>
          <Rail onClick={share} label={shared ? "Copied" : "Share"}>
            {shared ? <Check className="h-6 w-6" /> : <Share2 className="h-6 w-6" />}
          </Rail>
          <Rail onClick={toggleSave} label={saved ? "Saved" : "Save"} active={saved}>
            <Bookmark className={`h-6 w-6 ${saved ? "fill-current" : ""}`} />
          </Rail>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pr-20">
          {bit.uploadedBy?.username && (
            <Link href={`/seller/${bit.uploadedBy._id}`} className="pointer-events-auto text-sm font-semibold text-white hover:underline">@{bit.uploadedBy.username}</Link>
          )}
          <p className="mt-1 line-clamp-2 text-[15px] text-white/90">{bit.title}</p>
          <p className="mt-1 text-[13px] text-white/60">{compact(bit.viewCount ?? 0)} views</p>
        </div>
      </div>

      {/* Always beside the video on larger screens; a sheet over it on phones when opened. */}
      <aside data-no-swipe className={`${panel ? "flex" : "hidden md:flex"} w-[22rem] shrink-0 flex-col overflow-hidden rounded-[1.75rem] bg-surface max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:max-h-[60%] max-md:w-auto`}>
        {showComments ? (
          <>
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <h2 className="font-display text-[15px] font-semibold text-ink">Comments ({comments.length})</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setPanel("products")} className="text-sm text-muted hover:text-ink">Products</button>
                <button onClick={() => setPanel(null)} aria-label="Close" className="md:hidden"><X className="h-4 w-4 text-muted" /></button>
              </div>
            </div>
            <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted">No comments yet. Be the first.</p>
              ) : comments.map((c) => (
                <div key={c._id} className="flex gap-2.5">
                  <Avatar name={c.user?.username} url={c.user?.profilePic?.url} size={32} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{c.user?.username ?? "guest"}</p>
                    <p className="text-[14px] leading-snug text-ink-soft">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {commentError && <p role="alert" className="px-5 pb-1 text-[13px] font-medium text-live">Couldn&apos;t post your comment. Try again.</p>}
            <form onSubmit={sendComment} className="flex items-center gap-2 border-t border-hairline p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" className="h-10 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />
              <button type="submit" disabled={sending || !text.trim()} aria-label="Send" className="btn-ink grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <h2 className="font-display text-[15px] font-semibold text-ink">
                {products.length ? `Shop this video (${products.length})` : "Shop this video"}
              </h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setPanel("comments")} className="text-sm text-muted hover:text-ink">Comments</button>
                <button onClick={() => setPanel(null)} aria-label="Close" className="md:hidden"><X className="h-4 w-4 text-muted" /></button>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {products.length === 0 ? (
                <p className="text-sm text-muted">No products tagged in this video.</p>
              ) : products.map((p) => (
                <Link key={p._id} href={`/product/${p._id}`} onClick={() => { watch.current.tapped = p._id; }} className="flex items-center gap-3 rounded-2xl border border-hairline p-2.5 transition-colors hover:bg-surface-2">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <ProductMedia src={p.image?.url} alt={p.name} sizes="56px" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[14px] font-medium text-ink">{p.name}</p>
                    <p className="text-[13px] text-muted">
                      <span className="font-semibold text-ink">{inr(p.discountedPrice ?? p.price)}</span>
                      {p.discountedPrice && p.discountedPrice < p.price && (
                        <span className="ml-1.5 line-through">{inr(p.price)}</span>
                      )}
                    </p>
                  </div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Rail({ onClick, label, active, children }: { onClick: () => void; label: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <span className={`grid h-12 w-12 place-items-center rounded-full backdrop-blur transition-colors ${active ? "bg-white text-ink" : "bg-black/45 text-white hover:bg-black/60"}`}>
        {children}
      </span>
      <span className="text-[11px] font-semibold text-white drop-shadow">{label}</span>
    </button>
  );
}
