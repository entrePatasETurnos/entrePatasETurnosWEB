import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "./api";
import { COOKIE } from "./session";

export type Role = "ADMINISTRATOR" | "CLIENT";

export type CurrentUser = {
  name: string;
  role: Role;
};

/**
 * Asks the API which role an access token's account has right now.
 *
 * The API deliberately keeps the role out of the token (a role inside a token is stale until the
 * token expires), and has no "what is my role" endpoint yet. So we ask a question only an
 * administrator may ask: listing every booking. 200 means administrator, 403 means client. The
 * server decides, so this cannot be faked from the browser.
 *
 * TODO: replace with a `role` field on GET /v1/users/me once the API offers one.
 */
export async function fetchRole(token: string): Promise<Role | null> {
  try {
    await apiFetch("/v1/accommodation-bookings?size=1", { token });
    return "ADMINISTRATOR";
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return "CLIENT";
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** The access token from the session cookie. Server-side only: never pass it to a Client Component. */
export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE.access)?.value ?? null;
}

/**
 * The signed-in user, or null. `cache` makes every component in one request share a single
 * answer, so the API is asked once per page render, not once per component.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE.access)?.value;
  if (!token) return null;

  const role = await fetchRole(token);
  if (!role) return null;

  const rawName = jar.get(COOKIE.name)?.value ?? "";
  let name = rawName;
  try {
    name = decodeURIComponent(rawName);
  } catch {
    // keep the raw value
  }
  return { name, role };
});

/** Where each role belongs after signing in. */
export function homeFor(role: Role): "/admin" | "/app" {
  return role === "ADMINISTRATOR" ? "/admin" : "/app";
}

/**
 * Guards a page: signed out goes to the login page, the wrong role goes to its own area.
 * Pages call this even though the proxy also checks, because the proxy only sees that a cookie
 * exists. This is the real check, made against the API.
 */
export async function requireRole(role: Role): Promise<CurrentUser & { token: string }> {
  const token = await getAccessToken();
  const user = await getCurrentUser();
  if (!token || !user) redirect("/entrar");
  if (user.role !== role) redirect(homeFor(user.role));
  return { ...user, token };
}
