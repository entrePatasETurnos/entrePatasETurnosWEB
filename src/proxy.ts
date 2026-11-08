import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api";
import { COOKIE, clearSession, refreshSession, writeSession, type SessionResponse } from "@/lib/session";

/**
 * Runs before every request to the signed-in areas (Next.js 16 calls this "proxy"; it used to be
 * "middleware"). It does two things:
 *
 * 1. Renews the session. The access token lives ~15 minutes; when its cookie has expired but the
 *    refresh token is still there, it gets a new pair from the API and passes the new token to the
 *    page in the same request, so the person never notices.
 * 2. Sends signed-out visitors of /admin and /app to the login page.
 *
 * This is an optimistic check (it only sees cookies). The real authorization happens in each page
 * and Server Action, which ask the API.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPrivate = pathname.startsWith("/admin") || pathname.startsWith("/app") || pathname === "/painel";

  const access = request.cookies.get(COOKIE.access)?.value;
  const refresh = request.cookies.get(COOKIE.refresh)?.value;
  const sessionId = request.cookies.get(COOKIE.session)?.value;

  // Signed in already? Skip the login page.
  if (pathname === "/entrar" && (access || (refresh && sessionId))) {
    return NextResponse.redirect(new URL("/painel", request.url));
  }

  if (!access && refresh && sessionId) {
    const renewed = await tryRefresh(sessionId, refresh);
    if (renewed) {
      // Hand the new token to this same request, then store it in the browser.
      request.cookies.set(COOKIE.access, renewed.accessToken);
      const response = NextResponse.next({ request: { headers: request.headers } });
      writeSession(response.cookies, renewed);
      return response;
    }
    if (isPrivate) {
      const response = toLogin(request, pathname + search);
      clearSession(response.cookies);
      return response;
    }
  }

  if (isPrivate && !access) {
    return toLogin(request, pathname + search);
  }

  return NextResponse.next();
}

async function tryRefresh(sessionId: string, refreshToken: string): Promise<SessionResponse | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await refreshSession(sessionId, refreshToken);
    } catch (error) {
      // 409 refresh_in_progress: another tab renewed at the same moment. Wait and try once more.
      if (error instanceof ApiError && error.status === 409 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
      return null;
    }
  }
  return null;
}

function toLogin(request: NextRequest, from: string) {
  const url = new URL("/entrar", request.url);
  if (from && from !== "/painel") url.searchParams.set("de", from);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*", "/painel", "/entrar"],
};
