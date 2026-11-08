"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, clearSession, revokeSession } from "./session";

/** Ends the session in the API (so the refresh token can no longer be used) and clears cookies. */
export async function signOut() {
  const jar = await cookies();
  const sessionId = jar.get(COOKIE.session)?.value;
  const token = jar.get(COOKIE.access)?.value;
  if (sessionId && token) {
    try {
      await revokeSession(sessionId, token);
    } catch (error) {
      // Signing out locally must work even if the API is down.
      console.warn("sign-out: could not revoke the session in the API", error);
    }
  }
  clearSession(jar);
  redirect("/");
}
