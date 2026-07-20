import "server-only";
import { cookies } from "next/headers";

export const TOKEN_COOKIE = "zatch_token";

/** JWT for the current request, read from the cookie set at login. Reading
 *  cookies() opts the page into dynamic rendering, so it re-fetches per user. */
export async function serverToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}
