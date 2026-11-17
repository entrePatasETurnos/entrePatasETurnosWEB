/**
 * Registration with e-mail and password (spec 009). The form's rules, and the Server Action's request
 * to `POST /v1/users` and handling of every answer in
 * `specs/009-user-registration/contracts/api-registration.md`. The API is never contacted; `fetch`
 * is stubbed.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAction } from "@/app/cadastro/actions";
import {
  INITIAL_REGISTRATION_STATE,
  confirmationError,
  readRegistration,
  validateRegistration,
  type RegistrationRequest,
} from "@/lib/registration";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid: RegistrationRequest = {
  email: "maria@example.com",
  name: "Maria",
  cpf: "123.456.789-09",
  password: "segredo-longo",
};

const GENERAL = "Não foi possível criar a sua conta agora. Tente novamente em instantes.";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("validateRegistration", () => {
  it("accepts complete input", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("asks for each empty field in the API's words", () => {
    expect(validateRegistration({ email: "", name: "", cpf: "", password: "" })).toEqual({
      email: "Informe o seu e-mail.",
      name: "Informe o seu nome completo.",
      cpf: "Informe o seu CPF.",
      password: "A senha deve ter ao menos 8 caracteres.",
    });
  });

  it("needs at least 8 characters of password", () => {
    expect(validateRegistration({ ...valid, password: "1234567" }).password).toBe(
      "A senha deve ter ao menos 8 caracteres.",
    );
    expect(validateRegistration({ ...valid, password: "12345678" })).toEqual({});
  });

  it("counts spaces in the password, which is never trimmed", () => {
    expect(validateRegistration({ ...valid, password: "        " })).toEqual({});
  });
});

describe("readRegistration", () => {
  it("trims e-mail, name and CPF but keeps the password exactly as typed", () => {
    expect(
      readRegistration(form({ email: " a@b.co ", name: " Ana ", cpf: " 123 ", password: "  senha  " })),
    ).toEqual({ email: "a@b.co", name: "Ana", cpf: "123", password: "  senha  " });
  });

  it("ignores every other key", () => {
    const read = readRegistration(form({ ...valid, confirm: "x", role: "ADMINISTRATOR" }));
    expect(Object.keys(read).sort()).toEqual(["cpf", "email", "name", "password"]);
  });
});

describe("confirmationError", () => {
  it("accepts an identical confirmation", () => {
    expect(confirmationError("abcdefgh", "abcdefgh")).toBeNull();
  });

  it("refuses a different one, including a difference in case or spaces", () => {
    expect(confirmationError("abcdefgh", "abcdefgH")).toBe("As senhas não conferem.");
    expect(confirmationError("abcdefgh ", "abcdefgh")).toBe("As senhas não conferem.");
  });

  it("asks for the confirmation when it is empty", () => {
    expect(confirmationError("abcdefgh", "")).toBe("Confirme a sua senha.");
  });
});

describe("registerAction", () => {
  const created = {
    id: 1,
    email: "maria@example.com",
    name: "Maria",
    status: "PENDING_EMAIL_VERIFICATION",
    role: "CLIENT",
    emailVerifiedAt: null,
    createdAt: "2026-11-16T12:00:00Z",
    updatedAt: "2026-11-16T12:00:00Z",
    _links: { self: { href: "/v1/users/1/registration" } },
  };

  it("posts exactly the four API fields as JSON and reports the created account", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(201, created));
    vi.stubGlobal("fetch", fetchMock);

    const state = await registerAction(
      INITIAL_REGISTRATION_STATE,
      form({ ...valid, password: " segredo-longo ", confirm: " segredo-longo " }),
    );

    expect(state).toEqual({ status: "created", email: "maria@example.com" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/v1/users");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBeUndefined();
    const body = JSON.parse(init.body);
    expect(Object.keys(body).sort()).toEqual(["cpf", "email", "name", "password"]);
    expect(body).toEqual({ ...valid, password: " segredo-longo " });
  });

  it("does not call the API when the form is invalid", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const state = await registerAction(INITIAL_REGISTRATION_STATE, form({ ...valid, password: "curta" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(state).toEqual({
      status: "error",
      values: { email: valid.email, name: valid.name, cpf: valid.cpf },
      fieldErrors: { password: "A senha deve ter ao menos 8 caracteres." },
    });
  });

  describe("on failure", () => {
    async function failWith(answer: Response | Error) {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const fetchMock =
        answer instanceof Error ? vi.fn().mockRejectedValue(answer) : vi.fn().mockResolvedValue(answer);
      vi.stubGlobal("fetch", fetchMock);
      const state = await registerAction(
        INITIAL_REGISTRATION_STATE,
        form({ ...valid, email: " maria@example.com " }),
      );
      if (state.status !== "error") throw new Error(`expected an error state, got ${state.status}`);
      // Kept for the retry; the password never comes back.
      expect(state.values).toEqual({ email: "maria@example.com", name: "Maria", cpf: "123.456.789-09" });
      expect(JSON.stringify(state)).not.toContain("segredo-longo");
      return state;
    }

    it("puts the API's field messages under their fields", async () => {
      const state = await failWith(
        json(400, {
          error: "invalid_request",
          message: "one or more fields are invalid",
          fields: {
            cpf: "CPF inválido. Confira os números digitados.",
            email: "E-mail inválido. Exemplo: voce@email.com",
          },
        }),
      );
      expect(state.fieldErrors).toEqual({
        cpf: "CPF inválido. Confira os números digitados.",
        email: "E-mail inválido. Exemplo: voce@email.com",
      });
      expect(state.formError).toBeUndefined();
    });

    it("shows a refusal of the whole body above the button", async () => {
      const state = await failWith(
        json(400, { error: "invalid_request", message: "x", fields: { body: "Informe os dados de cadastro." } }),
      );
      expect(state.formError).toBe("Informe os dados de cadastro.");
    });

    it("says the user already exists, with the API's message, and offers sign-in", async () => {
      const state = await failWith(
        json(409, { error: "USER_ALREADY_EXISTS", message: "Usuário já cadastrado; conta vinculada a GOOGLE." }),
      );
      expect(state.formError).toBe("Usuário já cadastrado; conta vinculada a GOOGLE.");
      expect(state.offerSignIn).toBe(true);
    });

    it("has its own words when the duplicate e-mail comes without a message", async () => {
      const state = await failWith(json(409, { error: "USER_ALREADY_EXISTS", message: null }));
      expect(state.formError).toBe("Usuário já cadastrado.");
      expect(state.offerSignIn).toBe(true);
    });

    it("puts a duplicate CPF under the CPF field and offers sign-in", async () => {
      const state = await failWith(json(409, { error: "CPF_ALREADY_EXISTS", message: "CPF já cadastrado." }));
      expect(state.fieldErrors).toEqual({ cpf: "CPF já cadastrado." });
      expect(state.offerSignIn).toBe(true);
    });

    it("gives the general message when the API fails", async () => {
      const state = await failWith(json(500, { error: "internal_error", message: null }));
      expect(state.formError).toBe(GENERAL);
      expect(state.offerSignIn).toBeUndefined();
    });

    it("gives the general message when the API cannot be reached", async () => {
      const state = await failWith(new TypeError("fetch failed"));
      expect(state.formError).toBe(GENERAL);
    });

    it("gives the general message when a success answer is not an account", async () => {
      const state = await failWith(new Response("not json", { status: 201 }));
      expect(state.formError).toBe(GENERAL);
    });
  });
});
