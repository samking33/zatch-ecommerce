import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { recordEvent } from "@/lib/event-health";

/**
 * Relay for the Meta Conversions API.
 *
 * The browser pixel loses events to ad blockers, iOS/ITP and dropped requests -
 * typically a fifth of them. Those blockers block `facebook.net`, not this
 * origin, so the same event sent from here still lands. Each call carries the
 * `eventID` the pixel already sent, which is how Meta counts one action once
 * instead of twice.
 *
 * This endpoint is public, so it trusts nothing in the body: the event name is
 * checked against the list the site actually fires, and every number and string
 * is clamped before it is forwarded. The access token stays server-side.
 */

const META_API = "https://graph.facebook.com/v26.0";
// Same pixel as the browser tag in app/layout.tsx.
const PIXEL_ID = "1421438440165577";

const ALLOWED_EVENTS = new Set([
  "ViewContent", "AddToCart", "AddToWishlist", "InitiateCheckout",
  "AddPaymentInfo", "Purchase", "Search", "CompleteRegistration",
]);

// Purchase is counted for tracking health but never forwarded: anyone can call this endpoint,
// so a relayed Purchase could be any amount. The browser pixel still sends it, and the
// server-side report belongs with the verified payment (backend `feat/meta-capi-purchase`).
const NOT_RELAYED = new Set(["Purchase"]);

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

const money = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, 1e9) : undefined;

/** Meta wants SHA-256 hex of the normalised value, never the value itself. */
const hash = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

type Content = { id?: string; quantity?: number; item_price?: number };

function customData(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const value = money(body.value);
  if (value !== undefined) out.value = value;

  const currency = str(body.currency, 3);
  if (currency && /^[A-Za-z]{3}$/.test(currency)) out.currency = currency.toUpperCase();

  if (Array.isArray(body.content_ids)) {
    const ids = body.content_ids.map((i) => str(i, 64)).filter(Boolean).slice(0, 100);
    if (ids.length) {
      out.content_ids = ids;
      out.content_type = "product";
    }
  }

  if (Array.isArray(body.contents)) {
    const contents = (body.contents as Content[])
      .map((c) => ({ id: str(c?.id, 64), quantity: money(c?.quantity) ?? 1, item_price: money(c?.item_price) }))
      .filter((c) => c.id)
      .slice(0, 100);
    if (contents.length) out.contents = contents;
  }

  const search = str(body.search_string, 200);
  if (search) out.search_string = search;

  const orderId = str(body.order_id, 100);
  if (orderId) out.order_id = orderId;

  return out;
}

export async function POST(req: Request) {
  // A public endpoint: refuse large bodies before parsing them. Real events are well under 4 KB.
  if (Number(req.headers.get("content-length") ?? 0) > 16_384) return new Response(null, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const event = str(body.event, 50);
  const eventId = str(body.eventId, 100);
  if (!event || !ALLOWED_EVENTS.has(event) || !eventId) return new Response(null, { status: 400 });

  // Counted before the token check, so tracking health works with or without CAPI.
  recordEvent(event, body.px === true, body.gt === true);

  // No token is the ordinary state until one is issued; accept and drop quietly
  // so the browser never retries and nothing is logged as an error.
  const token = process.env.META_CAPI_TOKEN;
  if (!token || NOT_RELAYED.has(event)) return new Response(null, { status: 204 });

  const h = await headers();
  const jar = await cookies();

  // Meta matches the browser's pixel hit to this one through _fbp/_fbc plus the
  // IP and user agent, so they are taken from the request rather than the body.
  const userData: Record<string, unknown> = {
    client_ip_address: h.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    client_user_agent: h.get("user-agent") ?? undefined,
    fbp: jar.get("_fbp")?.value,
    fbc: jar.get("_fbc")?.value,
  };

  // Hashed here, never in the browser, so raw contact details are not handed to
  // a third party and never reach an analytics request.
  const email = str(body.email, 200);
  if (email) userData.em = [hash(email)];
  const phone = str(body.phone, 30);
  if (phone) userData.ph = [hash(phone.replace(/[^0-9]/g, ""))];

  // Trust our own origin for the URL rather than whatever the body claims.
  const origin = h.get("origin");
  const path = str(body.path, 500) ?? "/";
  const sourceUrl = origin ? `${origin}${path.startsWith("/") ? path : `/${path}`}` : undefined;

  const payload = {
    data: [
      {
        event_name: event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: sourceUrl,
        action_source: "website",
        user_data: userData,
        custom_data: customData(body),
      },
    ],
  };

  try {
    const res = await fetch(`${META_API}/${PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    // Meta's reply can quote the payload back, so it is never passed to the
    // browser; a failure here must not break the page either.
    if (!res.ok) {
      console.error("CAPI rejected event", event, res.status);
      return new Response(null, { status: 202 });
    }
  } catch {
    return new Response(null, { status: 202 });
  }

  return new Response(null, { status: 202 });
}
