"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Radio, Loader2, Users, Heart, Share2, Check, Square } from "lucide-react";
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { live as liveApi, apiError, type LiveDetails } from "@/lib/api";
import { onEvent, rooms } from "@/lib/socket";
import { getToken } from "@/lib/client-auth";
import { compact } from "@/lib/utils";

type Phase = "ready" | "starting" | "live" | "ending" | "ended";
type Stats = { totalViews?: number; peakViewers?: number; duration?: number; totalComments?: number };
type Msg = { username?: string; text: string };

/** The host's side of a live, as the app's go-live screen: publish camera and mic, watch the chat, end with confirmation. */
export function LiveStudio({ room }: { room: LiveDetails }) {
  const [phase, setPhase] = useState<Phase>(room.status === "ended" ? "ended" : "ready");
  const [err, setErr] = useState<string | null>(null);
  const [viewers, setViewers] = useState(room.viewersCount ?? 0);
  const [likes, setLikes] = useState(room.likeCount ?? 0);
  const [msgs, setMsgs] = useState<Msg[]>(() => [...(room.comments ?? [])].reverse().slice(-40).map((c) => ({ username: c.user?.username, text: c.text })));
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const media = useRef<{ client: IAgoraRTCClient | null; tracks: [IMicrophoneAudioTrack, ICameraVideoTrack] | null }>({ client: null, tracks: null });

  useEffect(() => {
    rooms.joinSession(room._id);
    const offs = [
      onEvent("newComment", (p) => {
        const c = (p.comment ?? p) as Msg & { user?: string };
        if (c?.text) setMsgs((m) => [...m, { username: c.username ?? c.user, text: c.text }].slice(-40));
      }),
      onEvent("likeUpdated", (p) => { if (typeof p.likeCount === "number") setLikes(p.likeCount); }),
      onEvent("viewersUpdated", (p) => {
        const n = p.viewersCount ?? p.count;
        if (typeof n === "number") setViewers(n);
      }),
    ];
    return () => { offs.forEach((off) => off()); rooms.leaveSession(room._id); };
  }, [room._id]);

  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [msgs]);

  // Leaving the page stops the camera; the session stays live until the host ends it, as in the app.
  useEffect(() => () => stopMedia(), []);

  useEffect(() => {
    if (phase !== "live") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  function stopMedia() {
    const m = media.current;
    m.tracks?.forEach((t) => t.close());
    m.client?.leave().catch(() => {});
    media.current = { client: null, tracks: null };
  }

  async function goLive() {
    const t = getToken();
    if (!t) return;
    setPhase("starting");
    setErr(null);
    const res = await liveApi.token(room._id, t);
    const failure = apiError(res, "Couldn't start the live. Try again.");
    if (failure || !res?.appId || !res.token || !res.channelName) {
      setErr(failure ?? "Couldn't start the live. Try again.");
      setPhase("ready");
      return;
    }
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      // Ask for the camera first, so a refused permission never joins the channel.
      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      media.current = { client, tracks };
      await client.setClientRole("host");
      await client.join(res.appId, res.channelName, res.token, res.uid ?? null);
      await client.publish(tracks);
      if (preview.current) tracks[1].play(preview.current);
      setPhase("live");
    } catch (e) {
      stopMedia();
      const code = (e as { code?: string }).code;
      setErr(
        code === "PERMISSION_DENIED"
          ? "Allow camera and microphone access in your browser to go live."
          : code === "DEVICE_NOT_FOUND"
            ? "No camera or microphone found. Connect one and try again."
            : "Couldn't start your camera. Close other apps using it, then try again.",
      );
      setPhase("ready");
    }
  }

  async function end() {
    const t = getToken();
    if (!t) return;
    const was = phase;
    setPhase("ending");
    setErr(null);
    const res = await liveApi.end(room._id, t);
    const failure = apiError(res, "Couldn't end the live. Try again.");
    if (failure) { setErr(failure); setPhase(was); return; }
    stopMedia();
    setConfirmEnd(false);
    setStats(res?.stats ?? {});
    setPhase("ended");
  }

  async function share() {
    const url = `${window.location.origin}/live/${room._id}`;
    try {
      if (navigator.share) await navigator.share({ title: room.title, url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* dismissed */ }
  }

  // A live whose stream dropped can still be ended without restarting the camera.
  const canEnd = phase === "live" || (phase === "ready" && room.status === "live");

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      <div className="card rounded-[2rem] p-3">
        <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-ink">
          <div ref={preview} className="absolute inset-0" />
          {phase !== "live" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/80">
              {phase === "starting" || phase === "ending" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <p className="text-sm">{phase === "ended" ? "This live has ended." : "Your camera turns on when you go live."}</p>
              )}
            </div>
          )}
          {phase === "live" && (
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[11px] font-semibold uppercase text-white"><Radio className="h-3 w-3" /> Live</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white"><Users className="h-3 w-3" /> {compact(viewers)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-ink">{room.title ?? "Your live"}</h1>
            <p className="mt-1 inline-flex items-center gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {compact(likes)}</span>
              {phase !== "ended" && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {compact(viewers)} watching</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {copied ? "Copied" : "Share"}
            </button>
            {(phase === "ready" || phase === "starting") && (
              <button onClick={goLive} disabled={phase === "starting"} className="pill-lime inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-70">
                <Radio className="h-4 w-4" /> Go live
              </button>
            )}
            {canEnd && (
              <button onClick={() => setConfirmEnd(true)} className="inline-flex items-center gap-1.5 rounded-full bg-live px-4 py-2 text-sm font-semibold text-white">
                <Square className="h-3.5 w-3.5 fill-current" /> End live
              </button>
            )}
          </div>
        </div>

        {confirmEnd && phase !== "ended" && (
          <div role="alertdialog" aria-labelledby="end-title" className="mx-2 mb-3 rounded-2xl bg-surface-2 p-4">
            <p id="end-title" className="font-semibold text-ink">End Live Session?</p>
            <p className="mt-1 text-sm text-muted">Are you sure you want to end this live session?</p>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setConfirmEnd(false)} className="px-3 text-sm text-muted hover:text-ink">Cancel</button>
              <button onClick={end} disabled={phase === "ending"} className="inline-flex items-center gap-1.5 rounded-full bg-live px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {phase === "ending" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} End
              </button>
            </div>
          </div>
        )}
        {err && <p role="alert" className="mx-2 mb-3 text-sm font-medium text-live">{err}</p>}

        {phase === "ended" && (
          <div className="mx-2 mb-2">
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                {[
                  ["Views", compact(stats.totalViews ?? 0)],
                  ["Peak viewers", compact(stats.peakViewers ?? 0)],
                  ["Duration", `${Math.floor((stats.duration ?? 0) / 60)}m ${(stats.duration ?? 0) % 60}s`],
                  ["Comments", compact(stats.totalComments ?? 0)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-surface-2 py-2.5">
                    <p className="text-[15px] font-semibold text-ink">{v}</p>
                    <p className="text-[11px] text-muted">{k}</p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/seller/live" className="mt-3 inline-block text-sm font-medium text-ink underline">Back to your lives</Link>
          </div>
        )}
      </div>

      <div className="card flex min-h-[20rem] flex-col rounded-[1.75rem] p-4">
        <p className="px-1 text-[13px] font-semibold uppercase tracking-widest text-muted">Live chat</p>
        <div ref={feed} className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {msgs.length === 0 ? (
            <p className="px-1 text-sm text-muted">Comments from buyers show up here.</p>
          ) : (
            msgs.map((m, i) => (
              <p key={i} className="text-[14px] leading-snug">
                <span className="font-semibold text-ink">{m.username ?? "guest"}</span> <span className="text-ink-soft">{m.text}</span>
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
