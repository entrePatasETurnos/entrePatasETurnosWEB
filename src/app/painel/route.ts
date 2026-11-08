import { NextResponse, type NextRequest } from "next/server";
import { fetchRole, homeFor } from "@/lib/auth";
import { COOKIE, clearSession } from "@/lib/session";

/**
 * GET /painel: "take me to my area". Asks the API for the role and redirects to /admin
 * (administrators) or /app (tutors). Used right after login and from the site's "Entrar" link
 * when already signed in.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE.access)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  const role = await fetchRole(token);
  if (!role) {
    const response = NextResponse.redirect(new URL("/entrar", request.url));
    clearSession(response.cookies);
    return response;
  }
  return NextResponse.redirect(new URL(homeFor(role), request.url));
}
