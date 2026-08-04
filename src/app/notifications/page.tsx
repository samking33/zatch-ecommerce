"use client";

import { useEffect, useState } from "react";
import {
  Bell, Check, Trash2, Loader2, Tag, Package, Truck, CheckCircle2, XCircle,
  Radio, Heart, MessageCircle, UserPlus, Wallet, ShieldCheck, TrendingDown, ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { notifications as notifApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

// The backend tags every notification with one of ~40 types - map to an icon.
const TYPE_ICON: Record<string, LucideIcon> = {
  bargain_new: Tag, bargain_sent: Tag, bargain_accepted: CheckCircle2,
  bargain_auto_accepted: CheckCircle2, bargain_countered: Tag, bargain_rejected: XCircle,
  bargain_buyer_accepted: CheckCircle2, bargain_buyer_countered: Tag, bargain_buyer_rejected: XCircle,
  order_new: Package, order_confirmed: CheckCircle2, order_paid: Wallet, order_packed: Package,
  pickup_scheduled: Truck, order_shipped: Truck, courier_delay: Truck,
  order_delivered: CheckCircle2, order_delivered_seller: CheckCircle2,
  order_cancelled: XCircle, order_cancelled_seller: XCircle,
  return_request: XCircle, return_approved: CheckCircle2, return_rejected: XCircle,
  refund_issued: Wallet, refund_processed: Wallet, payout_processed: Wallet,
  live_now: Radio, live_scheduled: Radio, live_starting_soon: Radio, live_summary: Radio,
  new_follower: UserPlus, follower_milestone: UserPlus,
  product_liked: Heart, product_commented: MessageCircle,
  price_drop: TrendingDown, cart_reminder: ShoppingCart,
  kyc_pending: ShieldCheck, kyc_verified: ShieldCheck, kyc_expiring: ShieldCheck,
  account_verified: ShieldCheck, password_changed: ShieldCheck,
};

// Notification types the backend pairs with an in-app destination.
function hrefFor(n: { type?: string; actionUrl?: string }): string | undefined {
  if (n.actionUrl?.startsWith("/")) return n.actionUrl;
  const t = n.type ?? "";
  if (t.startsWith("bargain_")) return "/bargains";
  if (t.startsWith("order_") || t.startsWith("return_") || t.startsWith("refund_")) return "/orders";
  if (t.startsWith("live_")) return "/live";
  if (t.startsWith("payout_")) return "/seller/payouts";
  if (t === "cart_reminder") return "/cart";
  return undefined;
}

type Notif = {
  _id: string;
  type?: string;
  actionUrl?: string;
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
                {(() => { const I = TYPE_ICON[n.type ?? ""] ?? Bell; return (
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isRead ? "bg-surface text-muted" : "bg-lime text-lime-ink"}`}>
                    <I className="h-4 w-4" />
                  </span>
                ); })()}
                <button onClick={() => { if (!isRead) markRead(n._id); const h = hrefFor(n); if (h) window.location.href = h; }} className="min-w-0 flex-1 text-left">
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
