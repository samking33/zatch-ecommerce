"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Heart, MessageCircle, Share2, Bookmark, Send, ShoppingBag, Check, Loader2,
} from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { bits as bitsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { compact, inr } from "@/lib/utils";
import type { Bit, BitComment } from "@/lib/types";

function videoUrl(b: Bit) {
  if (!b.video) return undefined;
  return typeof b.video === "string" ? b.video : b.video.url;
}

/** Full Bit player with the mobile app's social rail: like, comment, share,
 *  save, and the products tagged in the video (tap to buy / bargain). */
export function BitModal({ bit, onClose }: { bit: Bit; onClose: () => void }) {
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

  // Record a real view once per open.
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
      if (navigator.share) await navigator.share({ title: bit.title ?? "Zatch Bit", url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* user dismissed the share sheet */ }
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

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/85 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl gap-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* player */}
        <div className="relative flex-1 overflow-hidden rounded-[1.75rem] bg-black">
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink backdrop-blur">
            <X className="h-4 w-4" />
          </button>

          {videoUrl(bit) ? (
            <video src={videoUrl(bit)} poster={bit.thumbnail?.url} controls autoPlay loop playsInline className="aspect-[9/16] max-h-[92vh] w-full bg-black object-contain" />
          ) : (
            <div className="aspect-[9/16] max-h-[92vh] w-full">
              <ProductMedia src={bit.thumbnail?.url} alt={bit.title ?? "Bit"} className="h-full w-full" />
            </div>
          )}

          {/* social rail */}
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

          {/* caption + seller */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pr-20">
            {bit.uploadedBy?.username && (
              <p className="text-sm font-semibold text-white">@{bit.uploadedBy.username}</p>
            )}
            <p className="mt-1 line-clamp-2 text-[15px] text-white/90">{bit.title}</p>
            <p className="mt-1 text-[13px] text-white/60">{compact(bit.viewCount ?? 0)} views</p>
          </div>
        </div>

        {/* side panel: comments or products */}
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
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-[12px] font-semibold text-ink">
                      {c.user?.profilePic?.url
                        ? <Image src={c.user.profilePic.url} alt="" width={32} height={32} className="h-full w-full object-cover" />
                        : (c.user?.username?.[0] ?? "?").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">{c.user?.username ?? "guest"}</p>
                      <p className="text-[14px] leading-snug text-ink-soft">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendComment} className="flex items-center gap-2 border-t border-hairline p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="h-10 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />
                <button type="submit" disabled={sending || !text.trim()} aria-label="Send" className="btn-ink grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-50">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
                <h2 className="font-display text-[15px] font-semibold text-ink">
                  {products.length ? `Shop this Bit (${products.length})` : "Shop this Bit"}
                </h2>
                <button onClick={() => setShowComments(true)} className="text-sm text-muted hover:text-ink">Comments</button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {products.length === 0 ? (
                  <p className="text-sm text-muted">No products tagged in this Bit.</p>
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
      </div>
    </div>
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
