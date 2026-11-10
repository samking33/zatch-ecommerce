import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate for /admin. The marketing dashboard shows ad spend and revenue and the
 * app has no admin role yet, so this fails closed: with no credentials set the
 * route simply does not exist in production. Swap the check for the admin
 * portal's own session when that is wired up.
 */
export const config = { matcher: "/admin/:path*" };

/** Compare without returning early on the first wrong byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const user = process.env.MARKETING_ADMIN_USER;
  const pass = process.env.MARKETING_ADMIN_PASS;

  // Unset: reachable locally so the page can be built and reviewed, hidden in
  // production so an unguarded dashboard can never ship by omission.
  if (!user || !pass) {
    return process.env.NODE_ENV === "production" ? new NextResponse(null, { status: 404 }) : NextResponse.next();
  }

  const [scheme, encoded] = (req.headers.get("authorization") ?? "").split(" ");
  if (scheme === "Basic" && encoded) {
    // A password may contain ":", the username may not, so only split the first.
    // A malformed header throws in atob; treat it as no credentials (401), not a server error.
    let decoded = "";
    try { decoded = atob(encoded); } catch { /* falls through to 401 */ }
    const at = decoded.indexOf(":");
    if (at > -1 && safeEqual(decoded.slice(0, at), user) && safeEqual(decoded.slice(at + 1), pass)) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Zatch marketing", charset="UTF-8"' },
  });
}
