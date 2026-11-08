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
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
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
