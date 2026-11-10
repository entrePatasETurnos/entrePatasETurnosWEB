/**
 * The proxy's signed-out handling. These cases are the constitution's Principle III check that
 * signed-out users cannot reach protected features (/painel, /admin, /app), and they run on every
 * pull request and push in the CI "Checks" box.
 */
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { COOKIE } from "@/lib/session";

const SITE = "http://site.test";

function request(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(SITE + path, { headers: cookie ? { cookie } : {} });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function redirectTarget(response: Response) {
  const location = response.headers.get("location");
  if (!location) throw new Error(`expected a redirect, got status ${response.status}`);
  const url = new URL(location);
  return { pathname: url.pathname, de: url.searchParams.get("de") };
}

const session = {
  sessionId: 7,
  accessToken: "new-access",
  accessTokenExpiresAt: "2030-01-01T00:15:00Z",
  expiresIn: 900,
  refreshToken: "new-refresh",
  refreshTokenExpiresAt: "2030-01-31T00:00:00Z",
  userId: 1,
  userEmail: "tutor@example.com",
  userName: "Tutor",
  deviceName: "test",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signed-out visitors of protected routes", () => {
  it("sends /painel to /entrar without a return path", async () => {
    const response = await proxy(request("/painel"));
    expect(response.status).toBe(307);
    expect(redirectTarget(response)).toEqual({ pathname: "/entrar", de: null });
  });

  it.each([
    ["/admin", "/admin"],
    ["/admin/reservas?x=1", "/admin/reservas?x=1"],
    ["/app", "/app"],
    ["/app/pets", "/app/pets"],
  ])("sends %s to /entrar and remembers where they were going", async (path, de) => {
    const response = await proxy(request(path));
    expect(response.status).toBe(307);
    expect(redirectTarget(response)).toEqual({ pathname: "/entrar", de });
  });

  it("does not call the API when there is no session at all", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await proxy(request("/admin"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("expired access token", () => {
  const stale = { [COOKIE.refresh]: "old-refresh", [COOKIE.session]: "7" };

  it("signs the visitor out when the API rejects the refresh token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(401, { error: "invalid_refresh_token" })));

    const response = await proxy(request("/admin", stale));

    expect(response.status).toBe(307);
    expect(redirectTarget(response).pathname).toBe("/entrar");
    const cleared = response.headers.getSetCookie().join("\n");
    for (const name of Object.values(COOKIE)) {
      expect(cleared).toMatch(new RegExp(`${name}=;`));
    }
  });

  it("renews the session and lets the request through when the refresh succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, session));
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(request("/admin", stale));

    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get(COOKIE.access)?.value).toBe("new-access");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/v1/auth/sessions/7/refresh",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("the sign-in page", () => {
  it("sends a signed-in visitor on to /painel", async () => {
    const response = await proxy(request("/entrar", { [COOKIE.access]: "token" }));
    expect(response.status).toBe(307);
    expect(redirectTarget(response).pathname).toBe("/painel");
  });

  it("shows the page to a signed-out visitor", async () => {
    const response = await proxy(request("/entrar"));
    expect(response.headers.get("location")).toBeNull();
  });
});
