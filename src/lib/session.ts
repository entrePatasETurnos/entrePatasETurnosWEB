import "server-only";
import { apiFetch } from "./api";

/**
 * Session tokens live in httpOnly cookies: the browser stores and sends them, but JavaScript on
 * the page cannot read them, so a script injected into the page cannot steal a session.
 */
export const COOKIE = {
  access: "ept_at",
  refresh: "ept_rt",
  session: "ept_sid",
  name: "ept_name",
} as const;

/** What `POST /v1/auth/sessions/google` and `.../refresh` return (API spec 014). */
export type SessionResponse = {
  sessionId: number;
  accessToken: string;
  accessTokenExpiresAt: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  userId: number;
  userEmail: string;
  userName: string;
  deviceName: string;
};

/** Anything with a `set` like Next's cookie stores (route handlers, proxy, server actions). */
type CookieWriter = {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
};

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

/**
 * The access cookie expires 30 seconds before the token does. When it is gone, the proxy uses the
 * refresh token to get a new pair before the page renders, so pages never hold a token that the
 * API is about to reject.
 */
const EARLY_EXPIRY_SECONDS = 30;

export function writeSession(cookies: CookieWriter, session: SessionResponse) {
  const refreshExpires = new Date(session.refreshTokenExpiresAt);
  cookies.set(COOKIE.access, session.accessToken, {
    ...base,
    maxAge: Math.max(1, session.expiresIn - EARLY_EXPIRY_SECONDS),
  });
  cookies.set(COOKIE.refresh, session.refreshToken, { ...base, expires: refreshExpires });
  cookies.set(COOKIE.session, String(session.sessionId), { ...base, expires: refreshExpires });
  cookies.set(COOKIE.name, encodeURIComponent(session.userName ?? ""), {
    ...base,
    expires: refreshExpires,
  });
}

export function clearSession(cookies: { delete(name: string): unknown }) {
  for (const name of Object.values(COOKIE)) {
    cookies.delete(name);
  }
}

export function signInWithGoogle(idToken: string, userAgent?: string) {
  return apiFetch<SessionResponse>("/v1/auth/sessions/google", {
    method: "POST",
    body: { idToken },
    headers: userAgent ? { "User-Agent": userAgent } : undefined,
  });
}

export function refreshSession(sessionId: string, refreshToken: string) {
  return apiFetch<SessionResponse>(`/v1/auth/sessions/${encodeURIComponent(sessionId)}/refresh`, {
    method: "POST",
    body: { refreshToken },
  });
}

export function revokeSession(sessionId: string, accessToken: string) {
  return apiFetch<void>(`/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    token: accessToken,
  });
}
