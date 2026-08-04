"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Heart, MessageCircle, Share2, Bookmark, Send, ShoppingBag, Check, Loader2,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { Avatar } from "@/components/ui/avatar";
import { bits as bitsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { compact, inr } from "@/lib/utils";
import type { Bit, BitComment } from "@/lib/types";

function videoUrl(b: Bit) {
  if (!b.video) return undefined;
  return typeof b.video === "string" ? b.video : b.video.url;
}

/**
 * Reel player. Holds the whole feed so you can move between videos the way the
 * app does: scroll, swipe, arrow keys, or the on-screen up/down controls.
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

  const current = list[i];
  const canPrev = i > 0;
  const canNext = i < list.length - 1;

  const go = useCallback(
    (dir: 1 | -1) => setI((n) => Math.min(Math.max(n + dir, 0), list.length - 1)),
    [list.length],
  );

  // Keyboard: up/down to move, escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Wheel: one gesture moves one video, so a trackpad flick does not skip five.
  const lock = useRef(false);
  function onWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaY) < 12 || lock.current) return;
    lock.current = true;
    go(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { lock.current = false; }, 450);
  }

  // Touch: vertical swipe.
  const startY = useRef(0);
  function onTouchStart(e: React.TouchEvent) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e: React.TouchEvent) {
    const dy = startY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 60) go(dy > 0 ? 1 : -1);
  }

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/85 p-3 backdrop-blur-sm"
      onClick={onClose}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-5xl gap-3" onClick={(e) => e.stopPropagation()}>
        {/* Remount per video so like/comment state belongs to the one on screen. */}
        <BitPane key={current._id} bit={current} onClose={onClose} />

        {/* Up/down, outside the card like a feed control */}
        {list.length > 1 && (
          <div className="absolute -right-14 top-1/2 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
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
function BitPane({ bit, onClose }: { bit: Bit; onClose: () => void }) {
  const router = useRouter();
  const [liked, setLiked] = useState(!!bit.isLiked);
  const [likes, setLikes] = useState(bit.likeCount ?? 0);
  const [saved, setSaved] = useState(!!bit.isSaved);
  const [comments, setComments] = useState<BitComment[]>(bit.comments ?? []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [shared, setShared] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bitsApi.view(bit._id, getToken()).catch(() => {});
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
    setText(""); setSending(true);
    const res = (await bitsApi.comment(bit._id, { text: body }, t)) as
      | { comment?: BitComment; comments?: BitComment[] } | null;
    setSending(false);
    if (res?.comments) setComments(res.comments);
    else if (res?.comment) setComments((c) => [...c, res.comment!]);
    else setComments((c) => [...c, { _id: `local-${Date.now()}`, text: body, user: { _id: "me", username: "You" } }]);
  }

  const products = bit.products ?? [];
  const src = videoUrl(bit);

  return (
    <>
      <div className="relative flex-1 overflow-hidden rounded-[1.75rem] bg-black">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink backdrop-blur">
          <X className="h-4 w-4" />
        </button>

        {src ? (
          <video
            key={bit._id}
            src={src}
            poster={bit.thumbnail?.url}
            controls
            autoPlay
            loop
            playsInline
            className="aspect-[9/16] max-h-[92vh] w-full bg-black object-contain"
          />
        ) : (
          <div className="aspect-[9/16] max-h-[92vh] w-full">
            <ProductMedia src={bit.thumbnail?.url} alt={bit.title ?? "Video"} className="h-full w-full" />
          </div>
        )}

        <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-4">
          <Rail onClick={toggleLike} label={compact(likes)} active={liked}>
            <Heart className={`h-6 w-6 ${liked ? "fill-live text-live" : ""}`} />
          </Rail>
          <Rail onClick={() => setShowComments((v) => !v)} label={compact(comments.length)}>
            <MessageCircle className="h-6 w-6" />
          </Rail>
          <Rail onClick={share} label={shared ? "Copied" : "Share"}>
            {shared ? <Check className="h-6 w-6" /> : <Share2 className="h-6 w-6" />}
          </Rail>
          <Rail onClick={toggleSave} label={saved ? "Saved" : "Save"} active={saved}>
            <Bookmark className={`h-6 w-6 ${saved ? "fill-current" : ""}`} />
          </Rail>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pr-20">
          {bit.uploadedBy?.username && (
            <p className="text-sm font-semibold text-white">@{bit.uploadedBy.username}</p>
          )}
          <p className="mt-1 line-clamp-2 text-[15px] text-white/90">{bit.title}</p>
          <p className="mt-1 text-[13px] text-white/60">{compact(bit.viewCount ?? 0)} views</p>
        </div>
      </div>

      <aside className="hidden w-[22rem] shrink-0 flex-col overflow-hidden rounded-[1.75rem] bg-surface md:flex">
        {showComments ? (
          <>
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <h2 className="font-display text-[15px] font-semibold text-ink">Comments ({comments.length})</h2>
              <button onClick={() => setShowComments(false)} className="text-sm text-muted hover:text-ink">Products</button>
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
              <button onClick={() => setShowComments(true)} className="text-sm text-muted hover:text-ink">Comments</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {products.length === 0 ? (
                <p className="text-sm text-muted">No products tagged in this video.</p>
              ) : products.map((p) => (
                <Link key={p._id} href={`/product/${p._id}`} className="flex items-center gap-3 rounded-2xl border border-hairline p-2.5 transition-colors hover:bg-surface-2">
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
