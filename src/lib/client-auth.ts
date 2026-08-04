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

const REFRESH_KEY = "zatch_refresh";

function setSession(token: string, user: SessionUser, refreshToken?: string) {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; samesite=lax${SECURE}`;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Kept for when the backend mounts its refresh endpoint (the controller
  // exists but has no route yet), so sessions can be renewed silently.
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

/** Access tokens last 7 days. Returns true when the stored one has expired. */
export function isTokenExpired(): boolean {
  const t = getToken();
  if (!t) return false;
  try {
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof p.exp === "number" && p.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

export function clearSession() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax${SECURE}`;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function post(path: string, body: unknown) {
  const res = await fetch(`/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message ?? "Something went wrong. Try again.");
  }
  return json;
}

export async function login(input: {
  phone: string;
  countryCode: string;
  password: string;
}): Promise<SessionUser> {
  // Same-origin via the Next rewrite → no CORS, no token header needed here.
  const json = await post("/user/login", input);
  if (!json?.token) throw new Error(json?.message ?? "Login failed.");
  setSession(json.token, json.user, json.refreshToken);
  return json.user as SessionUser;
}

export async function register(input: {
  username: string;
  phone: string;
  countryCode: string;
  password: string;
  email?: string;
}): Promise<SessionUser> {
  await post("/user/register", input);
  // Registration succeeded - sign in to establish the session.
  return login({ phone: input.phone, countryCode: input.countryCode, password: input.password });
}

// OTP login - the mobile app's primary sign-in. Send a code to the phone,
// verify it, then log in with method:"otp" (no password required).
export const otp = {
  send: (phone: string, countryCode: string) =>
    post("/twilio-sms/send-otp", { phoneNumber: phone, countryCode }),
  verify: (phone: string, countryCode: string, code: string) =>
    post("/twilio-sms/verify-otp", { phoneNumber: phone, countryCode, otp: code }),
};

// Email OTP, and the combined phone+email 2FA the app uses for sensitive flows.
export const emailOtp = {
  send: (email: string) => post("/email/send-email-otp", { email }),
  verify: (email: string, code: string) => post("/email/verify-email-otp", { email, otp: code }),
};

export const bothOtp = {
  send: (email: string, phone: string, countryCode: string) =>
    post("/otp/send-both", { email, countryCode, phoneNumber: phone }),
  verify: (i: { email: string; phone: string; countryCode: string; emailOtp: string; phoneOtp: string }) =>
    post("/otp/verify-both", {
      email: i.email, countryCode: i.countryCode, phoneNumber: i.phone,
      emailOtp: i.emailOtp, phoneOtp: i.phoneOtp,
    }),
};

export async function loginWithOtp(input: {
  phone: string;
  countryCode: string;
}): Promise<SessionUser> {
  const json = await post("/user/login", { ...input, method: "otp" });
  if (!json?.token) throw new Error(json?.message ?? "Login failed.");
  setSession(json.token, json.user, json.refreshToken);
  return json.user as SessionUser;
}

// Forgot-password flow (3 steps).
export const forgot = {
  sendOtp: (phone: string, countryCode: string) => post("/user/forgot-password/send-otp", { phone, countryCode }),
  verifyOtp: (phone: string, countryCode: string, otp: string) => post("/user/forgot-password/verify-otp", { phone, countryCode, otp }),
  reset: (phone: string, countryCode: string, newPassword: string, confirmPassword: string) =>
    post("/user/forgot-password/reset", { phone, countryCode, newPassword, confirmPassword }),
};
