/**
 * GET /painel: sends a signed-in person to their area. The requests below use the standalone
 * server's own address, as they arrive behind the production NGINX; the Location must never carry
 * that address, because the browser cannot reach it.
 */
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/painel/route";
import { COOKIE } from "@/lib/session";

function painel(cookie?: string) {
  return new NextRequest("http://0.0.0.0:3000/painel", {
    headers: {
      host: "www.example.com",
      "x-forwarded-host": "www.example.com",
      "x-forwarded-proto": "https",
      ...(cookie ? { cookie } : {}),
    },
  });
}

function api(status: number) {
  return new Response(JSON.stringify(status === 200 ? { content: [] } : { error: "x" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /painel", () => {
  it.each([
    ["an administrator", 200, "/admin"],
    ["a tutor", 403, "/app"],
  ])("sends %s to their area with a relative Location", async (_who, status, home) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(api(status)));

    const response = await GET(painel(`${COOKIE.access}=token`));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(home);
  });

  it("sends a signed-out visitor to /entrar without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(painel());

    expect(response.headers.get("location")).toBe("/entrar");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears a rejected session and sends the visitor to /entrar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(api(401)));

    const response = await GET(painel(`${COOKIE.access}=expired`));

    expect(response.headers.get("location")).toBe("/entrar");
    for (const name of Object.values(COOKIE)) {
      expect(response.cookies.get(name)?.value, `cookie ${name}`).toBe("");
    }
  });
});
