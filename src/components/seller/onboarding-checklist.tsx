import Link from "next/link";
import { Check, Circle, ArrowRight } from "lucide-react";

type Item = { label: string; completed?: boolean; action?: string; route?: string; info?: string };

// Only the mobile routes that differ on web; the rest pass through as-is.
const ROUTE_MAP: Record<string, string> = {
  "/seller/products/create": "/seller/products/new",
  "/seller/settings/bargain": "/seller/settings",
  "/seller/bits/create": "/seller/bits",
  "/seller/live/schedule": "/seller/live",
};

export function OnboardingChecklist({
  completion,
  checklist,
}: {
  completion?: { percentage?: number; completedCount?: number; totalCount?: number };
  checklist?: Item[];
}) {
  const items = checklist ?? [];
  if (items.length === 0) return null;

  const pct = completion?.percentage ?? 0;
  if (pct >= 100) return null; // fully set up — get out of the seller's way

  return (
    <div className="card mb-4 rounded-[1.75rem] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Finish setting up your shop</h2>
          <p className="text-sm text-muted">
            {completion?.completedCount ?? 0} of {completion?.totalCount ?? items.length} done
          </p>
        </div>
        <span className="font-display text-2xl font-semibold text-ink">{pct}%</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-5 space-y-1.5">
        {items.map((it, i) => {
          const href = ROUTE_MAP[it.route ?? ""] ?? it.route ?? "/seller/dashboard";
          return (
            <Link
              key={i}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${it.completed ? "opacity-60" : "hover:bg-surface-2"}`}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${it.completed ? "bg-lime text-lime-ink" : "bg-surface-2 text-muted"}`}>
                {it.completed ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] ${it.completed ? "text-muted line-through" : "font-medium text-ink"}`}>{it.label}</span>
                {it.info && !it.completed && <span className="block text-[12px] text-muted">{it.info}</span>}
              </span>
              {!it.completed && <ArrowRight className="h-4 w-4 shrink-0 text-muted" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
