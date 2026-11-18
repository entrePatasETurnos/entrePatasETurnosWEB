/**
 * User management data access and form rules (spec 010, contracts/api-users.md). `fetch` is stubbed;
 * the API is never contacted.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { changeUserRole, getMyId, getUser, listUsers, renameUser, statusLabel } from "@/lib/admin-users";
import { normalizeSearch, parsePage, readUserEdit, validateName } from "@/lib/user-edit";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubFetch(response: () => Response) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const PAGE = { items: [], page: { number: 0, size: 20, totalItems: 0, totalPages: 0 } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listUsers", () => {
  it("sends q, page and size, with the token", async () => {
    const fetchMock = stubFetch(() => json(200, PAGE));
    await listUsers("tok", { q: "maria", page: 2, size: 20 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/v1/users?q=maria&page=2&size=20");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("leaves out an empty search", async () => {
    const fetchMock = stubFetch(() => json(200, PAGE));
    await listUsers("tok", { q: "", page: 0, size: 20 });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/v1/users?page=0&size=20");
  });

  it("answers null when the API has no user list yet", async () => {
    stubFetch(() => json(404, { error: "not_found" }));
    await expect(listUsers("tok")).resolves.toBeNull();
  });

  it("throws on any other failure", async () => {
    stubFetch(() => json(500, { error: "boom" }));
    await expect(listUsers("tok")).rejects.toMatchObject({ status: 500 });
  });
});

describe("getUser", () => {
  it("reads one account", async () => {
    const fetchMock = stubFetch(() => json(200, { id: 7, name: "Ana" }));
    await expect(getUser("tok", 7)).resolves.toMatchObject({ id: 7 });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/v1/users/7");
  });

  it("answers null for an unknown account", async () => {
    stubFetch(() => json(404, { error: "not_found" }));
    await expect(getUser("tok", 7)).resolves.toBeNull();
  });
});

describe("writes", () => {
  it("renames with PUT /v1/users/{id}/name and only the name", async () => {
    const fetchMock = stubFetch(() => json(200, { id: 7, name: "Ana Souza" }));
    await renameUser("tok", 7, "Ana Souza");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/v1/users/7/name");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({ name: "Ana Souza" });
  });

  it("changes the role with PUT /v1/users/{id}/role", async () => {
    const fetchMock = stubFetch(() => json(200, {}));
    await changeUserRole("tok", 7, "ADMINISTRATOR");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/v1/users/7/role");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({ role: "ADMINISTRATOR" });
  });

  it("reads the caller's id from /v1/users/me", async () => {
    const fetchMock = stubFetch(() => json(200, { id: 3, name: "Eu" }));
    await expect(getMyId("tok")).resolves.toBe(3);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/v1/users/me");
  });
});

describe("statusLabel", () => {
  it("names known statuses and shows unknown ones as given", () => {
    expect(statusLabel("PENDING_EMAIL_VERIFICATION")).toBe("Aguardando confirmação de e-mail");
    expect(statusLabel("LOCKED")).toBe("LOCKED");
  });
});

describe("validateName", () => {
  it("requires a name after trimming", () => {
    expect(validateName("")).toBe("Informe o nome completo.");
    expect(validateName("   ")).toBe("Informe o nome completo.");
  });

  it("accepts 255 characters and refuses 256", () => {
    expect(validateName("a".repeat(255))).toBeUndefined();
    expect(validateName("a".repeat(256))).toBe("O nome deve ter no máximo 255 caracteres.");
  });
});

describe("readUserEdit", () => {
  it("trims names and reads the confirmation flag", () => {
    const data = new FormData();
    data.set("name", "  Ana  ");
    data.set("role", "CLIENT");
    data.set("originalName", "Ana");
    data.set("originalRole", "CLIENT");
    data.set("confirmRole", "1");
    expect(readUserEdit(data)).toEqual({
      name: "Ana",
      role: "CLIENT",
      originalName: "Ana",
      originalRole: "CLIENT",
      confirmRole: true,
    });
  });
});

describe("list parameters", () => {
  it("normalizes the search", () => {
    expect(normalizeSearch("  maria ")).toBe("maria");
    expect(normalizeSearch(undefined)).toBe("");
    expect(normalizeSearch(["a", "b"])).toBe("a");
    expect(normalizeSearch("x".repeat(150))).toHaveLength(100);
  });

  it("parses the page", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("-1")).toBe(0);
    expect(parsePage("abc")).toBe(0);
    expect(parsePage(undefined)).toBe(0);
  });
});
