"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Heart, Share2, Check } from "lucide-react";
import { AgoraPlayer } from "./agora-player";
import { BargainBox } from "@/components/product/bargain-box";
import { live as liveApi } from "@/lib/api";
import { onEvent, rooms } from "@/lib/socket";
import { getToken } from "@/lib/client-auth";
import { compact } from "@/lib/utils";

type Msg = { _id?: string; id?: number; username?: string; user?: string; text: string };

export function LiveRoom({
  sessionId,
  title,
  productId,
  listPrice = 0,
  viewers,
}: {
  sessionId: string;
  title: string;
  productId?: string;
  listPrice?: number;
  viewers?: number;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [likes, setLikes] = useState(0);
  const [liveViewers, setLiveViewers] = useState(viewers ?? 0);
  const [ended, setEnded] = useState(false);
  const feed = useRef<HTMLDivElement>(null);
  const localId = useRef(0);

  // Seed history once, then take live updates over the socket — same events
  // the mobile app listens to (newComment / likeUpdated / viewersUpdated).
  useEffect(() => {
    let stop = false;
    liveApi.comments(sessionId).then((res) => {
      const list = Array.isArray(res) ? res : (res as { comments?: Msg[] })?.comments ?? [];
      if (!stop && list.length) setMsgs(list.slice(-40));
    });

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
      stop = true;
      offs.forEach((off) => off());
      rooms.leaveSession(sessionId);
    };
  }, [sessionId]);

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!text.trim() || !t) return;
    const optimistic: Msg = { id: ++localId.current, user: "you", text };
    setMsgs((m) => [...m, optimistic].slice(-40));
    setText("");
    await liveApi.comment(sessionId, { text: optimistic.text }, t);
  }

  async function like() {
    const t = getToken();
    setLikes((l) => l + 1);
    if (t) liveApi.like(sessionId, t).catch(() => {});
  }

  const [shared, setShared] = useState(false);
  async function share() {
    // Backend mints the canonical share link; fall back to this URL.
    const res = (await liveApi.share(sessionId)) as { shareLink?: string; url?: string } | null;
    const url = res?.shareLink ?? res?.url ?? window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* dismissed */ }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      {/* stage */}
      <div className="card relative overflow-hidden rounded-[2rem] p-3">
        <AgoraPlayer sessionId={sessionId} viewers={liveViewers} />
        <div className="flex items-center justify-between px-3 py-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
            <p className="mt-1 text-sm text-muted">
              {ended ? "This stream has ended." : "Bargains open · tap to join the negotiation"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={like} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-semibold text-ink hover:bg-canvas">
              <Heart className="h-4 w-4 fill-live text-live" /> {compact(likes)}
            </button>
            <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[13px] font-semibold text-ink hover:bg-canvas">
              {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {shared ? "Copied" : "Share"}
            </button>
          </div>
        </div>
      </div>

      {/* chat + bargain */}
      <div className="flex flex-col gap-4">
        {productId ? (
          <BargainBox productId={productId} listPrice={listPrice || 999} autoAcceptDiscount={15} maxDiscount={30} />
        ) : null}

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
          <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something or make an offer…"
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
