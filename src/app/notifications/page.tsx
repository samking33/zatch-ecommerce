"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Trash2, Loader2 } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { notifications as notifApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

type Notif = {
  _id: string;
  title?: string;
  message?: string;
  body?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
};

export default function NotificationsPage() {
  const [token, setToken] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    setToken(t); setReady(true);
    if (!t) { setLoading(false); return; }
    notifApi.list(t).then((n) => {
      setList((n as Notif[]) ?? []);
      setLoading(false);
    });
  }, []);

  const unread = list.filter((n) => !(n.isRead ?? n.read)).length;

  async function markRead(id: string) {
    if (!token) return;
    setList((l) => l.map((n) => (n._id === id ? { ...n, isRead: true, read: true } : n)));
    await notifApi.markRead(id, token);
  }

  async function markAll() {
    if (!token) return;
    setList((l) => l.map((n) => ({ ...n, isRead: true, read: true })));
    await notifApi.markAllRead(token);
  }

  async function remove(id: string) {
    if (!token) return;
    setList((l) => l.filter((n) => n._id !== id));
    await notifApi.remove(id, token);
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          eyebrow="Account"
          title="Notifications"
          sub={unread > 0 ? `${unread} unread` : undefined}
        />
        {unread > 0 && (
          <button onClick={markAll} className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-2">
            <Check className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {ready && !token ? (
        <SignInRequired what="your notifications" />
      ) : loading ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
            <Bell className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">You&apos;re all caught up</h2>
          <p className="mt-2 text-muted">Deal drops and seller counters will land here.</p>
        </div>
      ) : (
        <div className="card rounded-[1.75rem] p-3">
          {list.map((n) => {
            const isRead = n.isRead ?? n.read;
            return (
              <div key={n._id} className={`group flex items-start gap-3 rounded-2xl px-4 py-3.5 ${isRead ? "" : "bg-surface-2"}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isRead ? "bg-hairline" : "bg-lime-deep"}`} />
                <button onClick={() => !isRead && markRead(n._id)} className="min-w-0 flex-1 text-left">
                  {n.title && <p className="font-medium text-ink">{n.title}</p>}
                  <p className="text-[15px] text-ink-soft">{n.message ?? n.body}</p>
                  {n.createdAt && (
                    <p className="mt-0.5 text-[12px] text-muted">
                      {new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                </button>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!isRead && (
                    <button onClick={() => markRead(n._id)} aria-label="Mark read" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => remove(n._id)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-live">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
