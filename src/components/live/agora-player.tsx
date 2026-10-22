"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Radio, Users } from "lucide-react";
import { live as liveApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { compact } from "@/lib/utils";

type Phase = "connecting" | "waiting" | "playing" | "offline" | "signedout" | "notyet" | "failed";

/** What the viewer did during the live, sent with the leave call (the app's LiveLeaveRequest). */
export type LiveSignals = { commented: boolean; liked: boolean; shared: boolean; tapped: string | null; viewed: string[] };

// Real Agora Web SDK player. Joins the session's RTC channel with credentials
// from POST /live/session/:id/join and plays the host's video track. The SDK is
// dynamically imported so it never touches the server bundle.
export function AgoraPlayer({
  sessionId,
  viewers,
  ended,
  signals,
}: {
  sessionId: string;
  viewers?: number;
  ended?: boolean;
  signals: React.RefObject<LiveSignals>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [notice, setNotice] = useState<string | null>(null);
  const [count, setCount] = useState(viewers ?? 0);
  // Time spent watching the picture, for the leave log.
  const playing = useRef<{ since: number | null; ms: number }>({ since: null, ms: 0 });

  useEffect(() => {
    const p = playing.current;
    if (phase === "playing" && p.since === null) p.since = Date.now();
    if (phase !== "playing" && p.since !== null) { p.ms += Date.now() - p.since; p.since = null; }
  }, [phase]);

  useEffect(() => {
    const token = getToken();
    if (ended) {
      setPhase("offline");
      return;
    }
    if (!token) {
      setPhase("signedout");
      return;
    }
    let joined = false;
    let left = false;
    // Sent once, also when the tab closes (keepalive), with the same fields the app sends.
    const leave = () => {
      if (!joined || left) return;
      left = true;
      const p = playing.current;
      const watchedMs = p.ms + (p.since !== null ? Date.now() - p.since : 0);
      const sig = signals.current;
      fetch(`/api/v1/live/session/${sessionId}/leave`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          watchedMs, tappedProduct: sig?.tapped ?? null, addedToCart: false, commented: !!sig?.commented, liked: !!sig?.liked,
          sharedDuringLive: !!sig?.shared, productsViewedDuringLive: sig?.viewed ?? [], source: "feed", deviceType: "web",
        }),
      }).catch(() => {});
    };
    window.addEventListener("pagehide", leave);

    let client: import("agora-rtc-sdk-ng").IAgoraRTCClient | null = null;
    let cancelled = false;
    // Keep the backend's viewer count accurate while we're watching.
    const heartbeat = setInterval(() => {
      liveApi.heartbeat(sessionId, token).catch(() => {});
    }, 30_000);

    (async () => {
      const res = await liveApi.join(sessionId, token);
      if (cancelled) return;
      const creds = res?.session;
      if (!creds?.appId || !creds?.token || !creds?.channelName) {
        // e.g. "This live session starts in 12 minutes. Come back then!"
        if (res?.success === false && res.message && !/not found|ended/i.test(res.message)) {
          setNotice(res.message);
          setPhase("notyet");
        } else setPhase("offline");
        return;
      }
      joined = true;
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      await client.setClientRole("audience");

      client.on("user-published", async (user, mediaType) => {
        await client!.subscribe(user, mediaType);
        if (mediaType === "video" && containerRef.current) {
          user.videoTrack?.play(containerRef.current);
          setPhase("playing");
        }
        if (mediaType === "audio") user.audioTrack?.play();
      });
      client.on("user-unpublished", () => {
        if (client && client.remoteUsers.length === 0) setPhase("waiting");
      });
      client.on("user-joined", () => setCount((c) => c + 1));
      client.on("user-left", () => setCount((c) => Math.max(0, c - 1)));

      try {
        await client.join(creds.appId, creds.channelName, creds.token, creds.uid ?? null);
        setPhase((p) => (p === "playing" ? p : "waiting"));
      } catch {
        // The show is on; the video connection didn't work (network, blocked ports...).
        setPhase("failed");
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      window.removeEventListener("pagehide", leave);
      leave();
      client?.removeAllListeners();
      client?.leave().catch(() => {});
    };
  }, [sessionId, ended, signals]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-ink">
      <div ref={containerRef} className="absolute inset-0 h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

      {phase !== "playing" && (
        <div className="absolute inset-0 grid place-items-center bg-ink text-center text-surface">
          <div>
            {phase === "connecting" && <Loader2 className="mx-auto h-7 w-7 animate-spin text-white/70" />}
            {phase !== "connecting" && (
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/10">
                <Radio className="h-6 w-6 text-white/80" />
              </span>
            )}
            <p className="mt-4 font-display text-lg font-semibold">
              {phase === "connecting" && "Connecting to the stream…"}
              {phase === "waiting" && "Waiting for the host to go live"}
              {phase === "offline" && "This stream has ended"}
              {phase === "signedout" && "Sign in to watch live"}
              {phase === "notyet" && (notice ?? "This live hasn't started yet")}
              {phase === "failed" && "Couldn't connect to the stream. Refresh to try again."}
            </p>
          </div>
        </div>
      )}

      {(phase === "playing" || phase === "waiting") && (
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-live px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-white">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Live
        </span>
      )}
      <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur">
        <Users className="h-3.5 w-3.5" /> {compact(count)}
      </span>
    </div>
  );
}
