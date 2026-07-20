"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Radio, Users } from "lucide-react";
import { live as liveApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import { compact } from "@/lib/utils";

type Phase = "connecting" | "waiting" | "playing" | "offline" | "signedout";

// Real Agora Web SDK player. Joins the session's RTC channel with credentials
// from POST /live/session/:id/join and plays the host's video track. The SDK is
// dynamically imported so it never touches the server bundle.
export function AgoraPlayer({ sessionId, viewers }: { sessionId: string; viewers?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [count, setCount] = useState(viewers ?? 0);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setPhase("signedout");
      return;
    }

    let client: import("agora-rtc-sdk-ng").IAgoraRTCClient | null = null;
    let cancelled = false;

    (async () => {
      const creds = await liveApi.join(sessionId, token);
      if (cancelled) return;
      if (!creds?.appId || !creds?.token || !creds?.channelName) {
        setPhase("offline");
        return;
      }
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
        setPhase("offline");
      }
    })();

    return () => {
      cancelled = true;
      liveApi.leave(sessionId, token).catch(() => {});
      client?.removeAllListeners();
      client?.leave().catch(() => {});
    };
  }, [sessionId]);

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
            </p>
          </div>
        </div>
      )}

      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-live px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-white">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Live
      </span>
      <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur">
        <Users className="h-3.5 w-3.5" /> {compact(count)}
      </span>
    </div>
  );
}
