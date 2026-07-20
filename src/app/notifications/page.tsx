import { Bell } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { notifications as notifApi } from "@/lib/api";
import { serverToken } from "@/lib/session";

export const metadata = { title: "Notifications" };

type Notif = {
  _id: string;
  title?: string;
  message?: string;
  body?: string;
  isRead?: boolean;
  createdAt?: string;
};

export default async function NotificationsPage() {
  const t = await serverToken();
  if (!t) {
    return (
      <PageShell>
        <div className="pt-6">
          <SignInRequired what="your notifications" />
        </div>
      </PageShell>
    );
  }

  const data = (await notifApi.list(t)) as Notif[] | null;
  const list = Array.isArray(data) ? data : [];

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="Notifications" />
      {list.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink">
            <Bell className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">You&apos;re all caught up</h2>
          <p className="mt-2 text-muted">Deal drops and seller counters will land here.</p>
        </div>
      ) : (
        <div className="card rounded-[1.75rem] p-3">
          {list.map((n) => (
            <div
              key={n._id}
              className={`flex gap-3 rounded-2xl px-4 py-3.5 ${n.isRead ? "" : "bg-surface-2"}`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-hairline" : "bg-lime-deep"}`} />
              <div>
                {n.title && <p className="font-medium text-ink">{n.title}</p>}
                <p className="text-[15px] text-ink-soft">{n.message ?? n.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
