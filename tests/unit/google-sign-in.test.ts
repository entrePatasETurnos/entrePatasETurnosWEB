/**
 * POST /api/auth/google: exchanging a Google ID token for an API session. This is the automated
 * check for the Google sign-in method required by the constitution's Principle III. Google and the
 * API are never contacted; `fetch` is stubbed.
 */
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/google/route";
import { COOKIE } from "@/lib/session";

const SITE = "http://site.test";

function signIn(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`${SITE}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: SITE, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const session = {
  sessionId: 7,
  accessToken: "access",
  accessTokenExpiresAt: "2030-01-01T00:15:00Z",
  expiresIn: 900,
  refreshToken: "refresh",
  refreshTokenExpiresAt: "2030-01-31T00:00:00Z",
  userId: 1,
  userEmail: "tutor@example.com",
  userName: "Tutor",
  deviceName: "test",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/google", () => {
  it("exchanges the token and stores the session in httpOnly cookies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, session));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(signIn({ idToken: "google-id-token" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/painel" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/v1/auth/sessions/google");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ idToken: "google-id-token" });

    const setCookies = response.headers.getSetCookie();
    for (const name of Object.values(COOKIE)) {
      const cookie = setCookies.find((c) => c.startsWith(`${name}=`));
      expect(cookie, `cookie ${name}`).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
    }
    expect(response.cookies.get(COOKIE.access)?.value).toBe("access");
  });

  it("rejects calls from another origin without contacting the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(signIn({ idToken: "x" }, { origin: "https://evil.test" }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing token", {}],
    ["a non-string token", { idToken: 42 }],
    ["a body that is not JSON", "not json"],
  ])("answers 400 to %s", async (_label, body) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(signIn(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes the API's rejection through", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(401, { error: "invalid_token" })));

    const response = await POST(signIn({ idToken: "expired" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_token" });
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("answers 502 when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(signIn({ idToken: "t" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "api_unreachable" });
  });
});
