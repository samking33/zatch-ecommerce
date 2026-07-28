"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Loader2, Share2, Check } from "lucide-react";
import { users } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

export function FollowButton({
  userId,
  initialFollowing,
  followers = 0,
}: {
  userId: string;
  initialFollowing?: boolean;
  followers?: number;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(!!initialFollowing);
  const [count, setCount] = useState(followers);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const t = getToken();
    if (!t) { router.push("/login"); return; }
    setBusy(true);
    const next = !following;
    setFollowing(next); setCount((n) => n + (next ? 1 : -1));
    const res = await users.toggleFollow(userId, t);
    setBusy(false);
    if (!res) { setFollowing(!next); setCount((n) => n + (next ? -1 : 1)); }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-70 ${
        following ? "border border-hairline bg-surface-2 text-ink" : "bg-ink text-surface"
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? "Following" : "Follow"}
      <span className={following ? "text-muted" : "text-surface/60"}>· {count}</span>
    </button>
  );
}

export function ShareProfileButton({ userId }: { userId: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const url = `${window.location.origin}/seller/${userId}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else await navigator.clipboard.writeText(url);
      setDone(true); setTimeout(() => setDone(false), 2000);
    } catch { /* dismissed */ }
  }
  return (
    <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-2">
      {done ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {done ? "Copied" : "Share"}
    </button>
  );
}
