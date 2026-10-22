"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, EyeOff, Trash2, Loader2, Send } from "lucide-react";
import { bits as bitsApi, apiError } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

/** Seller reel actions → PATCH /bits/:id/action (Activate | Deactivate | Delete). */
export function BitActions({ bitId, isActive = true }: { bitId: string; isActive?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(action: "Activate" | "Deactivate" | "Delete") {
    const t = getToken();
    if (!t) return;
    if (action === "Delete" && !window.confirm("Delete this Bit? This can't be undone.")) return;
    setBusy(action);
    setErr(null);
    const res = await bitsApi.action(bitId, { action }, t);
    setBusy(null);
    if (!res) { setErr(`Couldn't ${action.toLowerCase()} this Bit. Try again.`); return; }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Bit actions"
        className="grid h-7 w-7 place-items-center rounded-full bg-white/85 text-ink backdrop-blur"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-hairline bg-surface shadow-lg">
          {isActive ? (
            <Item onClick={() => run("Deactivate")} icon={EyeOff} label="Deactivate" />
          ) : (
            <Item onClick={() => run("Activate")} icon={Eye} label="Activate" />
          )}
          <Item onClick={() => run("Delete")} icon={Trash2} label="Delete" danger />
          {err && <p role="alert" className="px-3 py-2 text-[12px] font-medium text-live">{err}</p>}
        </div>
      )}
    </div>
  );
}

function Item({ onClick, icon: Icon, label, danger }: { onClick: () => void; icon: typeof Eye; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-surface-2 ${danger ? "text-live" : "text-ink"}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

/** The seller's reply on their own Bit → POST /bits/:id/comments, as the app's "Add Comment". */
export function BitCommentForm({ bitId }: { bitId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !text.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const res = await bitsApi.comment(bitId, { text: text.trim() }, t);
    setBusy(false);
    const failure = apiError(res, "Couldn't add your comment. Try again.");
    if (failure) return setErr(failure);
    setText("");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="mt-3">
      <div className="flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" aria-label="Add a comment"
          className="h-11 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none" />
        <button disabled={busy || !text.trim()} aria-label="Send" className="btn-ink grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      {err && <p role="alert" className="mt-2 text-[13px] font-medium text-live">{err}</p>}
    </form>
  );
}
