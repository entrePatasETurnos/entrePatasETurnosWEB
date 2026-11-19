/**
 * The user list's row Server Action (spec 011, research R5–R7). The real `requireRole` runs, so the access
 * check is the one pages use: the role comes from the API for the session's token, however the session
 * was started (Google or password). `fetch` is stubbed by route; cookies, redirects and `refresh` are mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: vi.fn(),
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

const refresh = vi.fn();
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const { saveUserRowAction } = await import("@/app/admin/usuarios/actions");
const { requireRole } = await import("@/lib/auth");
const { INITIAL_USER_ROW_STATE } = await import("@/lib/user-edit");

type Call = { method: string; path: string; body?: unknown };
type Route = (call: Call) => Response | undefined;

const TARGET = 7;
const ME = 3;
const SAVED = { id: TARGET, name: "Ana Souza", email: "ana@example.com", role: "CLIENT", status: "ACTIVE" };

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
      if (call.method === "PATCH") return json(200, { ...SAVED, ...(call.body as object) });
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
    return await saveUserRowAction(id, INITIAL_USER_ROW_STATE, form(fields));
  } catch (error) {
    if (error instanceof Redirect) return { redirectedTo: error.to };
    throw error;
  }
}

const writes = () => calls.filter((call) => call.method === "PATCH");

beforeEach(() => {
  jar.clear();
  jar.set("ept_at", "token-admin");
  refresh.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("access (Principle III)", () => {
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

  it("guards the list page the same way: clients and signed-out visitors never reach the list", async () => {
    api(undefined, "CLIENT");
    await expect(requireRole("ADMINISTRATOR")).rejects.toMatchObject({ to: "/app" });
    jar.clear();
    api();
    await expect(requireRole("ADMINISTRATOR")).rejects.toMatchObject({ to: "/entrar" });
    expect(calls.some((call) => call.path.startsWith("/v1/users"))).toBe(false);
  });
});

describe("renaming (US2)", () => {
  it("sends nothing when nothing changed", async () => {
    api();
    await expect(save({})).resolves.toEqual({ status: "unchanged" });
    expect(writes()).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["   ", "Informe o nome completo."],
    ["a".repeat(256), "O nome deve ter no máximo 255 caracteres."],
  ])("refuses an invalid name before calling the API", async (name, message) => {
    api();
    await expect(save({ name })).resolves.toMatchObject({ status: "error", fieldErrors: { name: message } });
    expect(writes()).toEqual([]);
  });

  it("sends the trimmed name in one PATCH, refreshes, and answers what the API saved", async () => {
    api();
    await expect(save({ name: "  Ana Souza  " })).resolves.toEqual({
      status: "saved",
      user: { id: TARGET, name: "Ana Souza", email: "ana@example.com", role: "CLIENT", status: "ACTIVE" },
    });
    expect(writes()).toEqual([{ method: "PATCH", path: "/v1/users/7", body: { name: "Ana Souza" } }]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("never edits the caller's own account", async () => {
    api();
    await expect(save({ name: "Eu Mesmo" }, ME)).resolves.toMatchObject({
      status: "error",
      formError: "Você não tem permissão para fazer isso.",
    });
    expect(writes()).toEqual([]);
  });

  it("shows the API's message for the name under the field", async () => {
    api((call) =>
      call.method === "PATCH" ? json(400, { error: "invalid_request", fields: { name: "Nome muito longo." } }) : undefined,
    );
    await expect(save({ name: "Ana Souza" })).resolves.toMatchObject({
      fieldErrors: { name: "Nome muito longo." },
      values: { name: "Ana Souza", role: "CLIENT" },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    [400, "Não foi possível salvar. Confira os dados."],
    [401, "Sua sessão expirou. Entre novamente."],
    [403, "Você não tem permissão para fazer isso."],
    [500, "Não foi possível salvar agora. Tente novamente."],
  ])("maps a %i answer to a message and keeps the typed name", async (status, message) => {
    api((call) => (call.method === "PATCH" ? json(status, { error: "x" }) : undefined));
    await expect(save({ name: "Ana Souza" })).resolves.toMatchObject({
      status: "error",
      formError: message,
      values: { name: "Ana Souza" },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says the user no longer exists and offers a reload", async () => {
    api((call) => (call.method === "PATCH" ? json(404, { error: "not_found" }) : undefined));
    await expect(save({ name: "Ana Souza" })).resolves.toMatchObject({
      formError: "Usuário não encontrado.",
      notFound: true,
    });
  });

  it("reports an unreachable API without losing the typed name", async () => {
    api((call) => {
      if (call.method === "PATCH") throw new TypeError("fetch failed");
      return undefined;
    });
    await expect(save({ name: "Ana Souza" })).resolves.toMatchObject({
      formError: "Não foi possível salvar agora. Tente novamente.",
      values: { name: "Ana Souza" },
    });
  });
});

describe("changing the profile (US3)", () => {
  it("does nothing until the change is confirmed", async () => {
    api();
    await expect(save({ role: "ADMINISTRATOR" })).resolves.toMatchObject({ formError: "Confirme a mudança de perfil." });
    expect(writes()).toEqual([]);
  });

  it("applies a confirmed change in one PATCH", async () => {
    api();
    await expect(save({ role: "ADMINISTRATOR", confirmRole: "1" })).resolves.toMatchObject({
      status: "saved",
      user: { role: "ADMINISTRATOR" },
    });
    expect(writes()).toEqual([{ method: "PATCH", path: "/v1/users/7", body: { role: "ADMINISTRATOR" } }]);
  });

  it("sends name and profile together in a single PATCH", async () => {
    api();
    await save({ name: "Ana Souza", role: "ADMINISTRATOR", confirmRole: "1" });
    expect(writes()).toEqual([
      { method: "PATCH", path: "/v1/users/7", body: { name: "Ana Souza", role: "ADMINISTRATOR" } },
    ]);
  });

  it("reports one failure and nothing saved when the combined change is refused", async () => {
    api((call) => (call.method === "PATCH" ? json(500, { error: "boom" }) : undefined));
    const result = await save({ name: "Ana Souza", role: "ADMINISTRATOR", confirmRole: "1" });
    expect(result).toMatchObject({ status: "error", formError: "Não foi possível salvar agora. Tente novamente." });
    expect(result).not.toHaveProperty("saved");
    expect(writes()).toHaveLength(1);
  });

  it("refuses an unknown role", async () => {
    api();
    await expect(save({ role: "ROOT", confirmRole: "1" })).resolves.toMatchObject({ formError: "Perfil inválido." });
    expect(writes()).toEqual([]);
  });

  it("maps the API's role field error", async () => {
    api((call) =>
      call.method === "PATCH" ? json(400, { error: "invalid_request", fields: { role: "Perfil desconhecido." } }) : undefined,
    );
    await expect(save({ role: "ADMINISTRATOR", confirmRole: "1" })).resolves.toMatchObject({ formError: "Perfil inválido." });
  });

  it("never changes the caller's own profile, even when confirmed", async () => {
    api();
    await expect(save({ role: "CLIENT", originalRole: "ADMINISTRATOR", confirmRole: "1" }, ME)).resolves.toMatchObject({
      formError: "Você não tem permissão para fazer isso.",
    });
    expect(writes()).toEqual([]);
  });
});
