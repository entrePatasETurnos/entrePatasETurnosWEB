import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api";
import { signInWithGoogle, writeSession } from "@/lib/session";

/**
 * POST /api/auth/google  { idToken }
 *
 * The login page gets an ID token from Google in the browser and sends it here. This handler
 * exchanges it with the API for our own session and stores the tokens in httpOnly cookies.
 * The tokens never reach page JavaScript.
 */
export async function POST(request: NextRequest) {
  // Only accept calls from our own pages (a simple CSRF guard).
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const idToken =
    body && typeof body === "object" && "idToken" in body && typeof body.idToken === "string"
      ? body.idToken
      : "";
  if (!idToken) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const session = await signInWithGoogle(idToken, request.headers.get("user-agent") ?? undefined);
    // /painel works out the role and sends the person to /admin or /app.
    const response = NextResponse.json({ redirectTo: "/painel" });
    writeSession(response.cookies, session);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.code ?? "sign_in_failed" }, { status: error.status });
    }
    console.error("sign-in: API unreachable", error);
    return NextResponse.json({ error: "api_unreachable" }, { status: 502 });
  }
}

/**
 * True when the browser's Origin names the host it actually asked for.
 *
 * Not `request.nextUrl.origin`: behind the production NGINX, the standalone server builds that from
 * the address it listens on (http://0.0.0.0:3000), so every real browser call looked cross-origin.
 * The host the browser asked for arrives as X-Forwarded-Host (set by NGINX) or Host. A cross-site
 * page cannot forge either: the browser sets Host itself, and adding X-Forwarded-Host to a
 * cross-origin fetch needs a CORS preflight this route never approves.
 *
 * No Origin header at all (non-browser clients, some same-origin navigations) is allowed, as before.
 */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false; // includes the literal "null" sent by sandboxed or privacy-sensitive contexts
  }

  const requestedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl.host;
  return originHost === requestedHost;
}
