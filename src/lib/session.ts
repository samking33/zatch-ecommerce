import "server-only";
import { cookies } from "next/headers";

export const TOKEN_COOKIE = "zatch_token";

/** JWT for the current request, read from the cookie set at login. Reading
 *  cookies() opts the page into dynamic rendering, so it re-fetches per user. */
export async function serverToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

/** Read the user id from the JWT payload (no verification - display gating only). */
export function userIdFromToken(token?: string): string | undefined {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return undefined;
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return json?._id ?? json?.id;
  } catch {
    return undefined;
  }
}
