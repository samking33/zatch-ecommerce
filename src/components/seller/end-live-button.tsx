"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Square } from "lucide-react";
import { live as liveApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

export function EndLiveButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function end() {
    const t = getToken();
    if (!t) return;
    if (!window.confirm("End this live stream? Viewers will be disconnected.")) return;
    setBusy(true);
    await liveApi.end(sessionId, t);
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={end} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-[13px] font-medium text-live transition-colors hover:bg-live/5 disabled:opacity-60">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />} End
    </button>
  );
}
