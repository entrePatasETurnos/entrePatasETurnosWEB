/**
 * User list data access and rules (spec 011, contracts/api-users.md). `fetch` is stubbed; the API is never
 * contacted.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { editUser, getMyId, listUsers, statusLabel } from "@/lib/admin-users";
import {
  changedFields,
  parsePage,
  parseRoleFilter,
  parseStatusFilter,
  readUserEdit,
  validateName,
  type UserEditInput,
} from "@/lib/user-edit";

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
  it("sends page and size with the token, and no search", async () => {
    const fetchMock = stubFetch(() => json(200, PAGE));
    await listUsers("tok", { page: 0, size: 20 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/v1/users?page=0&size=20");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("adds the role and status filters only when given", async () => {
    const fetchMock = stubFetch(() => json(200, PAGE));
    await listUsers("tok", { role: "ADMINISTRATOR", status: "DISABLED", page: 1, size: 20 });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/v1/users?role=ADMINISTRATOR&status=DISABLED&page=1&size=20");
  });

  it.each([404, 500])("throws on a %i answer (no 'em breve' fallback)", async (status) => {
    stubFetch(() => json(status, { error: "x" }));
    await expect(listUsers("tok")).rejects.toMatchObject({ status });
  });
});

describe("editUser", () => {
  it("sends one PATCH /v1/users/{id} with exactly the given changes", async () => {
    const fetchMock = stubFetch(() => json(200, { id: 7, name: "Ana Souza", role: "ADMINISTRATOR" }));
    await expect(editUser("tok", 7, { name: "Ana Souza", role: "ADMINISTRATOR" })).resolves.toMatchObject({ id: 7 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/v1/users/7");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ name: "Ana Souza", role: "ADMINISTRATOR" });
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

describe("changedFields", () => {
  const input = (over: Partial<UserEditInput>): UserEditInput => ({
    name: "Ana",
    role: "CLIENT",
    originalName: "Ana",
    originalRole: "CLIENT",
    confirmRole: false,
    ...over,
  });

  it("keeps only what differs from what the row showed", () => {
    expect(changedFields(input({}), "CLIENT")).toEqual({});
    expect(changedFields(input({ name: "Ana Souza" }), "CLIENT")).toEqual({ name: "Ana Souza" });
    expect(changedFields(input({}), "ADMINISTRATOR")).toEqual({ role: "ADMINISTRATOR" });
    expect(changedFields(input({ name: "Bia" }), "ADMINISTRATOR")).toEqual({ name: "Bia", role: "ADMINISTRATOR" });
  });
});

describe("list parameters", () => {
  it("parses the page", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "5"])).toBe(2);
    expect(parsePage("-1")).toBe(0);
    expect(parsePage("abc")).toBe(0);
    expect(parsePage(undefined)).toBe(0);
  });

  it("accepts only known profiles", () => {
    expect(parseRoleFilter("ADMINISTRATOR")).toBe("ADMINISTRATOR");
    expect(parseRoleFilter(["CLIENT", "ADMINISTRATOR"])).toBe("CLIENT");
    expect(parseRoleFilter("")).toBeUndefined();
    expect(parseRoleFilter("administrator")).toBeUndefined();
    expect(parseRoleFilter("XYZ")).toBeUndefined();
    expect(parseRoleFilter(undefined)).toBeUndefined();
  });

  it("accepts only known statuses", () => {
    expect(parseStatusFilter("PENDING_EMAIL_VERIFICATION")).toBe("PENDING_EMAIL_VERIFICATION");
    expect(parseStatusFilter(["DISABLED"])).toBe("DISABLED");
    expect(parseStatusFilter("")).toBeUndefined();
    expect(parseStatusFilter("active")).toBeUndefined();
    expect(parseStatusFilter("LOCKED")).toBeUndefined();
  });
});
