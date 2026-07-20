"use client";

// Client-side session. Token lives in a readable cookie so server components
// pick it up on the next request, and in localStorage for instant UI.
// ponytail: non-httpOnly cookie (same model as the mobile app's stored token).
// Upgrade to an httpOnly cookie set by a route handler if XSS surface grows.

export const TOKEN_COOKIE = "zatch_token";
const USER_KEY = "zatch_user";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  _id: string;
  username?: string;
  phone?: string;
  email?: string;
  profilePic?: { url?: string };
  [k: string]: unknown;
};

export function getToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(/(?:^|;\s*)zatch_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

// Add Secure on HTTPS so the token is never sent over plain HTTP.
const SECURE = typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "";

function setSession(token: string, user: SessionUser) {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; samesite=lax${SECURE}`;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax${SECURE}`;
  localStorage.removeItem(USER_KEY);
}

export async function login(input: {
  phone: string;
  countryCode: string;
  password: string;
}): Promise<SessionUser> {
  // Same-origin via the Next rewrite → no CORS, no token header needed here.
  const res = await fetch("/api/v1/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.token) {
    throw new Error(json?.message ?? "Login failed. Check your details.");
  }
  setSession(json.token, json.user);
  return json.user as SessionUser;
}
