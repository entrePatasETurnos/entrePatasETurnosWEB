/**
 * The user edit Server Action (spec 010, research R4–R6). The real `requireRole` runs, so the access
 * check is the one pages use: the role comes from the API for the session's token, however the session
 * was started (Google or password). `fetch` is stubbed by route; cookies and redirects are mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
const setCookie = vi.fn((name: string, value: string) => {
  jar.set(name, value);
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: setCookie,
  }),
}));

class Redirect extends Error {
  constructor(public readonly to: string) {
    super(`redirect ${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

const { saveUserAction } = await import("@/app/admin/usuarios/actions");
const { INITIAL_USER_EDIT_STATE } = await import("@/lib/user-edit");

type Call = { method: string; path: string; body?: unknown };
type Route = (call: Call) => Response | undefined;

const TARGET = 7;
const ME = 3;

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

let calls: Call[] = [];

/** Routes the API by method and path. The role check and /me answer as an administrator unless overridden. */
function api(overrides: Route = () => undefined, role: "ADMINISTRATOR" | "CLIENT" = "ADMINISTRATOR") {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace("http://api.test", "");
      const call: Call = { method: init?.method ?? "GET", path, body: init?.body ? JSON.parse(String(init.body)) : undefined };
      calls.push(call);
      const answer = overrides(call);
      if (answer) return answer;
      if (path.startsWith("/v1/accommodation-bookings")) return json(role === "ADMINISTRATOR" ? 200 : 403);
      if (path === "/v1/users/me") return json(200, { id: ME, name: "Eu" });
      if (call.method === "PUT") return json(200, { id: TARGET });
      return json(500, { error: "unexpected" });
    }),
  );
}

function form(fields: Partial<Record<"name" | "role" | "originalName" | "originalRole" | "confirmRole", string>>) {
  const data = new FormData();
  const all = { name: "Ana", role: "CLIENT", originalName: "Ana", originalRole: "CLIENT", ...fields };
  for (const [key, value] of Object.entries(all)) data.set(key, value);
  return data;
}

async function save(fields: Parameters<typeof form>[0], id = TARGET) {
  try {
    return await saveUserAction(id, INITIAL_USER_EDIT_STATE, form(fields));
  } catch (error) {
    if (error instanceof Redirect) return { redirectedTo: error.to };
    throw error;
  }
}

const writes = () => calls.filter((call) => call.method === "PUT");

beforeEach(() => {
  jar.clear();
  jar.set("ept_at", "token-admin");
  setCookie.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("access", () => {
  it("sends a client to their own area without touching the account", async () => {
    api(undefined, "CLIENT");
    await expect(save({ name: "Outro" })).resolves.toEqual({ redirectedTo: "/app" });
    expect(writes()).toEqual([]);
  });

  it("sends a signed-out caller to the login page", async () => {
    jar.clear();
    api();
    await expect(save({ name: "Outro" })).resolves.toEqual({ redirectedTo: "/entrar" });
    expect(calls).toEqual([]);
  });
});

describe("renaming (US1)", () => {
  it("says there is nothing to save, without calling the API", async () => {
    api();
    await expect(save({})).resolves.toMatchObject({ status: "error", formError: "Nada para salvar." });
    expect(writes()).toEqual([]);
  });

  it("refuses a blank name before calling the API", async () => {
    api();
    await expect(save({ name: "   " })).resolves.toMatchObject({ fieldErrors: { name: "Informe o nome completo." } });
    expect(writes()).toEqual([]);
  });

  it("sends the trimmed name once, then goes back to the page with a notice", async () => {
    api();
    await expect(save({ name: "  Ana Souza  " })).resolves.toEqual({ redirectedTo: "/admin/usuarios/7?aviso=salvo" });
    expect(writes()).toEqual([{ method: "PUT", path: "/v1/users/7/name", body: { name: "Ana Souza" } }]);
  });

  it("shows the API's message for the name under the field", async () => {
    api((call) => (call.path.endsWith("/name") ? json(400, { error: "invalid_request", fields: { name: "Nome muito longo." } }) : undefined));
    await expect(save({ name: "Ana Souza" })).resolves.toMatchObject({
      fieldErrors: { name: "Nome muito longo." },
      values: { name: "Ana Souza", role: "CLIENT" },
    });
  });

  it.each([
    [404, "Usuário não encontrado."],
    [401, "Sua sessão expirou. Entre novamente."],
    [500, "Não foi possível salvar agora. Tente novamente."],
  ])("maps a %i answer to a message and keeps the typed name", async (status, message) => {
    api((call) => (call.path.endsWith("/name") ? json(status, { error: "x" }) : undefined));
    await expect(save({ name: "Ana Souza" })).resolves.toMatchObject({
      formError: message,
      values: { name: "Ana Souza" },
    });
  });

  it("updates the header name when administrators rename themselves", async () => {
    api();
    await save({ name: "Eu Mesmo" }, ME);
    expect(setCookie).toHaveBeenCalledWith("ept_name", encodeURIComponent("Eu Mesmo"), expect.any(Object));
  });

  it("leaves the header name alone when renaming someone else", async () => {
    api();
    await save({ name: "Ana Souza" });
    expect(setCookie).not.toHaveBeenCalled();
  });
});

describe("changing the profile (US2)", () => {
  it("does nothing until the change is confirmed", async () => {
    api();
    await expect(save({ role: "ADMINISTRATOR" })).resolves.toMatchObject({ formError: "Confirme a mudança de perfil." });
    expect(writes()).toEqual([]);
  });

  it("applies a confirmed change", async () => {
    api();
    await expect(save({ role: "ADMINISTRATOR", confirmRole: "1" })).resolves.toEqual({
      redirectedTo: "/admin/usuarios/7?aviso=salvo",
    });
    expect(writes()).toEqual([{ method: "PUT", path: "/v1/users/7/role", body: { role: "ADMINISTRATOR" } }]);
  });

  it("refuses an unknown role", async () => {
    api();
    await expect(save({ role: "ROOT", confirmRole: "1" })).resolves.toMatchObject({ formError: "Perfil inválido." });
    expect(writes()).toEqual([]);
  });

  it("never changes the caller's own profile, even when confirmed", async () => {
    api();
    await expect(save({ role: "CLIENT", originalRole: "ADMINISTRATOR", confirmRole: "1" }, ME)).resolves.toMatchObject({
      formError: "Você não pode alterar o seu próprio perfil.",
    });
    expect(writes()).toEqual([]);
  });

  it("renames before changing the role", async () => {
    api();
    await save({ name: "Ana Souza", role: "ADMINISTRATOR", confirmRole: "1" });
    expect(writes().map((call) => call.path)).toEqual(["/v1/users/7/name", "/v1/users/7/role"]);
  });

  it.each([
    [404, "not_found", "Usuário não encontrado."],
    [409, "own_role_change_forbidden", "Você não pode alterar o seu próprio perfil."],
    [500, "boom", "Não foi possível salvar agora. Tente novamente."],
  ])("says the name was saved when the role change fails (%i)", async (status, code, reason) => {
    api((call) => (call.path.endsWith("/role") ? json(status, { error: code }) : undefined));
    await expect(save({ name: "Ana Souza", role: "ADMINISTRATOR", confirmRole: "1" })).resolves.toMatchObject({
      saved: { name: "Ana Souza" },
      formError: `Nome salvo. O perfil não foi alterado: ${reason}`,
    });
  });

  it("does not change the role when the rename fails", async () => {
    api((call) => (call.path.endsWith("/name") ? json(500, { error: "boom" }) : undefined));
    await save({ name: "Ana Souza", role: "ADMINISTRATOR", confirmRole: "1" });
    expect(writes().map((call) => call.path)).toEqual(["/v1/users/7/name"]);
  });
});
