"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Bookmark, Share2, Check, Star, Send, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { products as productsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { compact } from "@/lib/utils";
import type { Product, ProductComment, ProductReview } from "@/lib/types";

/** Like / save / share row - mirrors the mobile product screen's actions. */
export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const [liked, setLiked] = useState(!!product.isLiked);
  const [likes, setLikes] = useState(product.likeCount ?? 0);
  const [saved, setSaved] = useState(!!product.isSaved);
  const [shared, setShared] = useState(false);

  // Real view tracking, once per mount.
  useEffect(() => {
    productsApi.view(product._id).catch(() => {});
  }, [product._id]);

  function auth(): string | null {
    const t = getToken();
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function like() {
    const t = auth(); if (!t) return;
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    const res = await productsApi.like(product._id, t);
    if (!res) { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); }
  }

  async function save() {
    const t = auth(); if (!t) return;
    setSaved((s) => !s);
    const res = await productsApi.save(product._id, t);
    if (!res) setSaved((s) => !s);
  }

  async function share() {
    const url = `${window.location.origin}/product/${product._id}`;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else await navigator.clipboard.writeText(url);
      setShared(true); setTimeout(() => setShared(false), 2000);
    } catch { /* dismissed */ }
    productsApi.share(product._id).catch(() => {});
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2.5">
      <button onClick={like} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${liked ? "border-live bg-live/10 text-live" : "border-hairline text-ink hover:bg-surface-2"}`}>
        <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes > 0 ? compact(likes) : "Like"}
      </button>
      <button onClick={save} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${saved ? "border-ink bg-ink text-surface" : "border-hairline text-ink hover:bg-surface-2"}`}>
        <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} /> {saved ? "Saved" : "Save"}
      </button>
      <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
        {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {shared ? "Copied" : "Share"}
      </button>
    </div>
  );
}

/** Reviews + comments, with real posting. */
export function ProductReviews({ product }: { product: Product }) {
  const router = useRouter();
  const [tab, setTab] = useState<"reviews" | "comments">("reviews");
  const [reviews, setReviews] = useState<ProductReview[]>(product.reviews ?? []);
  const [comments, setComments] = useState<ProductComment[]>(product.comments ?? []);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function auth(): string | null {
    const t = getToken();
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = auth(); if (!t || !text.trim()) return;
    setBusy(true); setMsg(null);
    const body = text.trim();
    if (tab === "reviews") {
      const res = await productsApi.review(product._id, { rating, comment: body }, t);
      setBusy(false);
      if (res) {
        setReviews((r) => [...r, { _id: `local-${Date.now()}`, rating, comment: body, user: { _id: "me", username: "You" } }]);
        setText(""); setMsg("Thanks for the review!");
      } else setMsg("Couldn't post your review.");
    } else {
      const res = await productsApi.comment(product._id, { text: body }, t);
      setBusy(false);
      if (res) {
        setComments((c) => [...c, { _id: `local-${Date.now()}`, text: body, user: { _id: "me", username: "You" } }]);
        setText(""); setMsg(null);
      } else setMsg("Couldn't post your comment.");
    }
  }

  return (
    <div className="card mt-4 rounded-[2rem] p-6 sm:p-8">
      <div className="flex gap-2">
        {(["reviews", "comments"] as const).map((k) => (
          <button
            key={k}
            onClick={() => { setTab(k); setMsg(null); }}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === k ? "bg-ink text-surface" : "text-ink hover:bg-surface-2"}`}
          >
            {k} ({k === "reviews" ? reviews.length : comments.length})
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {(tab === "reviews" ? reviews : comments).length === 0 ? (
          <p className="text-[15px] text-muted">
            {tab === "reviews" ? "No reviews yet. Be the first to rate it." : "No questions yet. Ask the seller anything."}
          </p>
        ) : tab === "reviews" ? (
          reviews.map((r) => (
            <div key={r._id} className="flex gap-3">
              <Avatar name={r.user?.username} url={r.user?.profilePic?.url} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-ink">{r.user?.username ?? "guest"}</p>
                  <span className="inline-flex items-center gap-0.5 text-[13px] text-ink-soft">
                    <Star className="h-3.5 w-3.5 fill-lime text-lime" /> {r.rating ?? 5}
                  </span>
                </div>
                <p className="text-[15px] leading-snug text-ink-soft">{r.comment}</p>
              </div>
            </div>
          ))
        ) : (
          comments.map((c) => (
            <div key={c._id} className="flex gap-3">
              <Avatar name={c.user?.username} url={c.user?.profilePic?.url} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{c.user?.username ?? "guest"}</p>
                <p className="text-[15px] leading-snug text-ink-soft">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="mt-6 border-t border-hairline pt-5">
        {tab === "reviews" && (
          <div className="mb-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-lime text-lime" : "text-hairline"}`} />
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tab === "reviews" ? "Write a review…" : "Ask a question…"}
            className="h-11 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Post" className="btn-ink grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        {msg && <p className="mt-2 text-sm font-medium text-ink">{msg}</p>}
      </form>
    </div>
  );
}

