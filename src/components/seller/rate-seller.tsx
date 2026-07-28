"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, Check } from "lucide-react";
import { users } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

/** Rate a seller → POST /user/review (the mobile app's seller rating). */
export function RateSeller({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit() {
    const t = getToken();
    if (!t) { router.push("/login"); return; }
    setState("saving");
    const res = await users.review({ userId, rating, comment }, t);
    setState(res ? "saved" : "error");
    if (res) setTimeout(() => { setOpen(false); router.refresh(); }, 900);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-2">
        <Star className="h-4 w-4" /> Rate
      </button>
    );
  }

  return (
    <div className="card w-full rounded-[1.25rem] p-4">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star className={`h-6 w-6 ${n <= rating ? "fill-lime text-lime" : "text-hairline"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="How was your experience?"
        className="mt-3 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none"
      />
      <div className="mt-3 flex gap-2">
        <button onClick={submit} disabled={state === "saving"} className="pill-lime inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-70">
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : null}
          {state === "saved" ? "Thanks!" : "Submit"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">Cancel</button>
      </div>
      {state === "error" && <p className="mt-2 text-sm font-medium text-live">Couldn&apos;t submit. Try again.</p>}
    </div>
  );
}
