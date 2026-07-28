"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tag, Bell, X, Check, XCircle } from "lucide-react";
import { onEvent, getSocket } from "@/lib/socket";
import { useAuth } from "@/components/auth/auth-provider";
import { inr } from "@/lib/utils";

type Toast = {
  id: number;
  icon: "bargain" | "accepted" | "rejected" | "bell";
  title: string;
  body?: string;
  href?: string;
};

const ICONS = {
  bargain: Tag,
  accepted: Check,
  rejected: XCircle,
  bell: Bell,
} as const;

/** Connects the shared socket once signed in and surfaces the push events the
 *  mobile app gets: bargain counters/accepts/rejects and notifications. */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!user) return;
    getSocket(); // connect with the current token

    let n = 0;
    const push = (t: Omit<Toast, "id">) => {
      const id = ++n;
      setToasts((list) => [...list, { ...t, id }].slice(-3));
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 8000);
      router.refresh(); // pull fresh server data behind the toast
    };

    const offs = [
      onEvent("bargain_countered", (p) =>
        push({
          icon: "bargain",
          title: "Seller countered",
          body: `${p.productName ?? "Your offer"} · ${inr(p.counterPrice)}`,
          href: `/bargains/${p.bargainId}`,
        })),
      onEvent("bargain_accepted", (p) =>
        push({
          icon: "accepted",
          title: "Offer accepted!",
          body: `${p.productName ?? "Your bargain"}${p.finalPrice ? ` · ${inr(p.finalPrice)}` : ""}`,
          href: `/bargains/${p.bargainId}`,
        })),
      onEvent("bargain_rejected", (p) =>
        push({ icon: "rejected", title: "Offer declined", body: p.productName, href: "/bargains" })),
      // seller side
      onEvent("new_bargain", (p) =>
        push({
          icon: "bargain",
          title: "New offer received",
          body: `${p.productName ?? "A product"}${p.offeredPrice ? ` · ${inr(p.offeredPrice)}` : ""}`,
          href: "/seller/bargains",
        })),
      onEvent("buyer_countered", (p) =>
        push({
          icon: "bargain",
          title: "Buyer countered",
          body: `${p.productName ?? "A bargain"}${p.counterPrice ? ` · ${inr(p.counterPrice)}` : ""}`,
          href: "/seller/bargains",
        })),
      onEvent("counter_accepted", (p) =>
        push({ icon: "accepted", title: "Buyer accepted your counter", body: p.productName, href: "/seller/bargains" })),
      onEvent("counter_rejected", (p) =>
        push({ icon: "rejected", title: "Buyer declined your counter", body: p.productName, href: "/seller/bargains" })),
      onEvent("new_notification", (p) =>
        push({ icon: "bell", title: p.title ?? "New notification", body: p.message ?? p.body, href: "/notifications" })),
    ];
    return () => offs.forEach((off) => off());
  }, [user, router]);

  return (
    <>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
          {toasts.map((t) => {
            const Icon = ICONS[t.icon];
            const body = (
              <div className="card flex items-start gap-3 rounded-2xl p-4 shadow-lg">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.icon === "rejected" ? "bg-live/10 text-live" : "bg-lime text-lime-ink"}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{t.title}</p>
                  {t.body && <p className="line-clamp-2 text-sm text-muted">{t.body}</p>}
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); setToasts((l) => l.filter((x) => x.id !== t.id)); }}
                  aria-label="Dismiss"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
            return t.href ? <Link key={t.id} href={t.href}>{body}</Link> : <div key={t.id}>{body}</div>;
          })}
        </div>
      )}
    </>
  );
}
