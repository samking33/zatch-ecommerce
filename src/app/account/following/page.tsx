"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { FollowButton } from "@/components/seller/follow-button";
import { users } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

type Followed = { _id: string; username?: string; profilePic?: { url?: string }; sellerStatus?: string };

// The app's "Following" screen: everyone you follow, searchable, with unfollow.
export default function FollowingPage() {
  const [token, setToken] = useState<string | undefined>();
  const [list, setList] = useState<Followed[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = getToken();
    setToken(t);
    if (!t) { setList([]); return; }
    users.profile(t).then((u) => {
      if (!u) { setFailed(true); setList([]); return; }
      setList(((u as { following?: Followed[] }).following ?? []).filter((f) => f?._id));
    });
  }, []);

  const shown = (list ?? []).filter((f) => (f.username ?? "").toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="Following" sub={list ? `${list.length} account${list.length !== 1 ? "s" : ""}` : undefined} />
      {list && !token ? (
        <SignInRequired what="who you follow" />
      ) : list === null ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : failed ? (
        <p role="alert" className="card rounded-[2rem] p-8 text-center text-muted">Couldn&apos;t load who you follow. Refresh to try again.</p>
      ) : list.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold text-ink">You&apos;re not following anyone yet</p>
          <Link href="/sellers" className="pill-lime mt-6 rounded-full px-6 py-3 text-sm font-semibold">Explore sellers</Link>
        </div>
      ) : (
        <>
          <label className="relative mb-4 flex items-center">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search following…" aria-label="Search following"
              className="h-11 w-full rounded-full border border-hairline bg-surface-2 pl-10 pr-4 text-[15px] text-ink focus:border-ink focus:outline-none" />
          </label>
          {shown.length === 0 ? (
            <p className="px-1 text-muted">No one matches &ldquo;{q}&rdquo;.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((f) => {
                const name = f.username ?? "User";
                return (
                  <div key={f._id} className="card flex items-center gap-3 rounded-[1.25rem] p-3">
                    <Link href={`/seller/${f._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 font-semibold text-ink">
                        {f.profilePic?.url ? <Image src={f.profilePic.url} alt={name} width={48} height={48} className="h-full w-full object-cover" /> : name[0]?.toUpperCase()}
                      </span>
                      <span className="line-clamp-1 text-[15px] font-medium text-ink">{name}</span>
                    </Link>
                    <FollowButton userId={f._id} initialFollowing compact />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
