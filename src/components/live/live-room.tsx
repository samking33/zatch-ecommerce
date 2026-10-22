"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Heart, Share2, Check, ShoppingBag } from "lucide-react";
import { AgoraPlayer, type LiveSignals } from "./agora-player";
import { ProductMedia } from "@/components/ui/product-media";
import { live as liveApi, apiError, type LiveDetails } from "@/lib/api";
import { onEvent, rooms } from "@/lib/socket";
import { getToken } from "@/lib/client-auth";
import { compact, inr } from "@/lib/utils";

type Msg = { _id?: string; id?: number; username?: string; user?: string; text: string };

export function LiveRoom({ room }: { room: LiveDetails }) {
  const router = useRouter();
  const sessionId = room._id;
  const products = room.products ?? [];
  // What the viewer does here goes with the leave call, as in the app.
  const signals = useRef<LiveSignals>({ commented: false, liked: !!room.isLiked, shared: false, tapped: null, viewed: products.map((p) => p._id) });

  // The details response carries the latest comments, newest first.
  const [msgs, setMsgs] = useState<Msg[]>(() =>
    [...(room.comments ?? [])].reverse().slice(-40).map((c, i) => ({ id: -i - 1, username: c.user?.username, text: c.text })),
  );
  const [text, setText] = useState("");
  const [likes, setLikes] = useState(room.likeCount ?? 0);
  const [liked, setLiked] = useState(!!room.isLiked);
  const [liveViewers, setLiveViewers] = useState(room.viewersCount ?? 0);
  const [ended, setEnded] = useState(room.status === "ended");
  const [error, setError] = useState<string | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const localId = useRef(0);

  // Live updates over the socket - same events the mobile app listens to (newComment / likeUpdated / viewersUpdated).
  useEffect(() => {
    rooms.joinSession(sessionId);
    const offs = [
      onEvent("newComment", (p) => {
        const c = (p.comment ?? p) as Msg;
        if (c?.text) setMsgs((m) => [...m, c].slice(-40));
      }),
      onEvent("likeUpdated", (p) => {
        if (typeof p.likeCount === "number") setLikes(p.likeCount);
      }),
      onEvent("viewersUpdated", (p) => {
        const n = p.viewersCount ?? p.count;
        if (typeof n === "number") setLiveViewers(n);
      }),
      onEvent("sessionEnded", () => setEnded(true)),
    ];
    return () => {
      offs.forEach((off) => off());
      rooms.leaveSession(sessionId);
    };
  }, [sessionId]);

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  function signedIn(): string | null {
    const t = getToken();
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    const t = signedIn(); if (!t) return;
    const optimistic: Msg = { id: ++localId.current, user: "you", text: body };
    setMsgs((m) => [...m, optimistic].slice(-40));
    setText("");
    setError(null);
    const res = await liveApi.comment(sessionId, { text: body }, t);
    const failure = apiError(res, "Couldn't send your message. Try again.");
    if (failure) {
      setMsgs((m) => m.filter((x) => x !== optimistic));
      setText(body);
      setError(failure);
    } else signals.current.commented = true;
  }

  // One like per viewer on the server, so the count comes from its answer.
  async function like() {
    if (liked) return;
    const t = signedIn(); if (!t) return;
    setLiked(true);
    setError(null);
    const res = await liveApi.like(sessionId, t);
    const failure = apiError(res, "Couldn't like this live. Try again.");
    if (failure) { setLiked(false); setError(failure); return; }
    if (typeof res?.likeCount === "number") setLikes(res.likeCount);
    signals.current.liked = true;
  }

  const [shared, setShared] = useState(false);
  async function share() {
    signals.current.shared = true;
    // Backend mints the canonical share link; fall back to this URL.
    const res = (await liveApi.share(sessionId, getToken())) as { shareLink?: string; url?: string } | null;
    const url = res?.shareLink ?? res?.url ?? window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: room.title, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* dismissed */ }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      {/* stage */}
      <div className="card relative overflow-hidden rounded-[2rem] p-3">
        <AgoraPlayer sessionId={sessionId} viewers={liveViewers} ended={ended} signals={signals} />
        <div className="flex items-center justify-between gap-3 px-3 py-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-ink">{room.title ?? "Live drop"}</h1>
            <p className="mt-1 text-sm text-muted">
              {ended ? "This stream has ended." : room.host?.username ? `Hosted by ${room.host.username}` : "Bargains open while the seller is live"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={like} aria-pressed={liked} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-semibold text-ink hover:bg-canvas">
              <Heart className={`h-4 w-4 text-live ${liked ? "fill-live" : ""}`} /> {compact(likes)}
            </button>
            <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-semibold text-ink hover:bg-canvas">
              {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {shared ? "Copied" : "Share"}
            </button>
          </div>
        </div>
      </div>

      {/* products + chat */}
      <div className="flex flex-col gap-4">
        {products.length > 0 && (
          <div className="card rounded-[1.75rem] p-4">
            <p className="px-1 text-[13px] font-semibold uppercase tracking-widest text-muted">In this live ({products.length})</p>
            <div className="mt-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {products.map((p) => {
                const sell = p.discountedPrice ?? p.price;
                const max = p.bargainSettings?.maximumDiscount ?? 0;
                return (
                  // A new tab keeps the stream playing while the buyer picks a variant, buys or makes an offer.
                  <Link key={p._id} href={`/product/${p._id}`} target="_blank" onClick={() => { signals.current.tapped = p._id; }}
                    className="flex items-center gap-3 rounded-2xl border border-hairline p-2.5 transition-colors hover:bg-surface-2">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                      <ProductMedia src={p.images?.[0]?.url} alt={p.name} sizes="56px" className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[14px] font-medium text-ink">{p.name}</p>
                      <p className="text-[13px] text-muted">
                        <span className="font-semibold text-ink">{inr(sell)}</span>
                        {max > 0 && <span> · offers from {inr(Math.ceil(sell * (1 - max / 100)))}</span>}
                      </p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime text-lime-ink"><ShoppingBag className="h-4 w-4" /></span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="card flex min-h-[20rem] flex-1 flex-col rounded-[1.75rem] p-4">
          <p className="px-1 text-[13px] font-semibold uppercase tracking-widest text-muted">Live chat</p>
          <div ref={feed} className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
            {msgs.length === 0 ? (
              <p className="px-1 text-sm text-muted">No messages yet. Say hi 👋</p>
            ) : (
              msgs.map((m, i) => (
                <div key={m._id ?? m.id ?? i} className="text-[14px] leading-snug">
                  <span className={`font-semibold ${(m.user ?? m.username) === "you" ? "text-lime-deep" : "text-ink"}`}>
                    {m.username ?? m.user ?? "guest"}
                  </span>{" "}
                  <span className="text-ink-soft">{m.text}</span>
                </div>
              ))
            )}
          </div>
          {error && <p role="alert" className="mt-2 px-1 text-[13px] font-medium text-live">{error}</p>}
          <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something or make an offer…"
              aria-label="Message"
              className="h-11 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
            <button type="submit" aria-label="Send" className="btn-ink grid h-11 w-11 shrink-0 place-items-center rounded-full">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
