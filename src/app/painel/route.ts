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
    return redirectTo("/entrar");
  }

  const role = await fetchRole(token);
  if (!role) {
    const response = redirectTo("/entrar");
    clearSession(response.cookies);
    return response;
  }
  return redirectTo(homeFor(role));
}

/**
 * A redirect with a relative Location, resolved by the browser against the address it is on.
 *
 * Not `NextResponse.redirect(new URL(path, request.url))`: behind the production NGINX, the
 * standalone server's request.url is its own listen address, so that sent people to
 * https://0.0.0.0:3000/app after signing in. (The proxy's redirects are not affected: Next.js
 * turns same-origin redirects from proxy.ts into relative ones itself.)
 */
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}
