import "server-only";

/**
 * A first-party count of the tracking events the site fires, so a tag that
 * stops working shows up within the hour rather than weeks later as a dip in a
 * platform report. Each event also records whether the Meta pixel and the
 * Google tag were actually loaded when it fired - that is precisely how the
 * tags failed before (they loaded after the page's events and silently missed
 * them), and nothing else would have shown it.
 *
 * ponytail: in memory, per server process, last 24 hours, reset on every deploy.
 * That answers "is tracking working right now" on a single Render instance.
 * Move it to Mongo through the backend if history or several instances matter.
 */

const HOURS = 24;
const HOUR_MS = 3_600_000;

type Bucket = { total: number; noPixel: number; noGtag: number };
type Store = { since: number; events: Map<string, Map<number, Bucket>>; lastSeen: Map<string, number> };

// On globalThis so the route that records and the page that reads share one
// store, however the bundler splits them into chunks.
const g = globalThis as unknown as { __zatchEventHealth?: Store };
const store: Store = (g.__zatchEventHealth ??= { since: Date.now(), events: new Map(), lastSeen: new Map() });

export function recordEvent(event: string, pixelLoaded: boolean, gtagLoaded: boolean) {
  const now = Date.now();
  const hour = Math.floor(now / HOUR_MS);
  let hours = store.events.get(event);
  if (!hours) store.events.set(event, (hours = new Map()));

  const b = hours.get(hour) ?? { total: 0, noPixel: 0, noGtag: 0 };
  b.total += 1;
  if (!pixelLoaded) b.noPixel += 1;
  if (!gtagLoaded) b.noGtag += 1;
  hours.set(hour, b);
  store.lastSeen.set(event, now);

  // Keep only the window; event names are an allowlist, so this stays small.
  for (const h of hours.keys()) if (h <= hour - HOURS) hours.delete(h);
}

export type EventHealth = { event: string; total: number; noPixel: number; noGtag: number; lastSeen?: number };

export function eventHealth(): { since: number; events: EventHealth[] } {
  const cutoff = Math.floor(Date.now() / HOUR_MS) - HOURS;
  const events = [...store.events].map(([event, hours]) => {
    const sum = { total: 0, noPixel: 0, noGtag: 0 };
    for (const [h, b] of hours) {
      if (h <= cutoff) continue;
      sum.total += b.total;
      sum.noPixel += b.noPixel;
      sum.noGtag += b.noGtag;
    }
    return { event, ...sum, lastSeen: store.lastSeen.get(event) };
  });
  return { since: store.since, events };
}
