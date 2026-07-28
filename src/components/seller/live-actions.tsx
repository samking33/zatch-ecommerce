"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Square, CalendarClock, XCircle } from "lucide-react";
import { live as liveApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

/** Seller controls for a scheduled/live session:
 *  End (live) · Reschedule · Cancel — PATCH /live/session/:id/action. */
export function LiveActions({ sessionId, status }: { sessionId: string; status?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isLive = ["live", "active", "started"].includes((status ?? "").toLowerCase());

  async function end() {
    const t = getToken();
    if (!t || !window.confirm("End this live stream? Viewers will be disconnected.")) return;
    setBusy("end");
    await liveApi.end(sessionId, t);
    setBusy(null);
    router.refresh();
  }

  async function act(action: "cancel" | "reschedule") {
    const t = getToken();
    if (!t) return;
    if (action === "cancel" && !window.confirm("Cancel this scheduled live?")) return;
    setBusy(action);
    setErr(null);
    const res = (await liveApi.action(
      sessionId,
      action === "reschedule"
        ? { action, scheduledStartTime: new Date(when).toISOString() }
        : { action },
      t,
    )) as { success?: boolean; message?: string; suggestedTime?: string } | null;
    setBusy(null);
    if (res?.success !== false) { setRescheduling(false); router.refresh(); }
    else setErr(res?.suggestedTime ? `${res.message} Try ${new Date(res.suggestedTime).toLocaleString("en-IN")}.` : res?.message ?? "Couldn't update.");
  }

  if (rescheduling) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="h-9 rounded-full border border-hairline bg-surface-2 px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
        />
        <button onClick={() => act("reschedule")} disabled={!when || busy === "reschedule"} className="pill-lime rounded-full px-4 py-2 text-[13px] font-semibold disabled:opacity-50">
          {busy === "reschedule" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </button>
        <button onClick={() => setRescheduling(false)} className="text-[13px] text-muted hover:text-ink">Cancel</button>
        {err && <p className="w-full text-right text-[12px] font-medium text-live">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-1.5">
      {isLive ? (
        <button onClick={end} disabled={busy === "end"} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-2 text-[13px] font-medium text-live hover:bg-live/5 disabled:opacity-60">
          {busy === "end" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />} End
        </button>
      ) : (
        <>
          <button onClick={() => setRescheduling(true)} title="Reschedule" className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-ink hover:bg-surface-2">
            <CalendarClock className="h-4 w-4" />
          </button>
          <button onClick={() => act("cancel")} disabled={busy === "cancel"} title="Cancel live" className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-live hover:bg-live/5 disabled:opacity-60">
            {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          </button>
        </>
      )}
    </div>
  );
}
