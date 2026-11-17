/**
 * The registration form's shapes and rules (spec 009).
 *
 * Client-safe on purpose (no "server-only"): the form runs these checks in the browser for early
 * feedback, and the Server Action runs them again before calling the API. The API stays the
 * authority: e-mail format and CPF validity are left to it, and its messages are shown as given.
 */

/** Same minimum as the API's `PasswordPolicy`. */
export const PASSWORD_MIN_LENGTH = 8;

/** Exactly the API's `RegistrationRequest`: four strings, nothing else. */
export type RegistrationRequest = { email: string; name: string; cpf: string; password: string };

/** What the form keeps after a failure. Never the password. */
export type RegistrationValues = { email: string; name: string; cpf: string };

export type RegistrationField = "email" | "name" | "cpf" | "password";

export type FieldErrors = Partial<Record<RegistrationField, string>>;

export type RegistrationState =
  | { status: "idle" }
  | { status: "created"; email: string }
  | {
      status: "error";
      values: RegistrationValues;
      fieldErrors: FieldErrors;
      /** Shown above the submit button. */
      formError?: string;
      /** The e-mail or the CPF is already registered: offer the sign-in link. */
      offerSignIn?: boolean;
    };

export const INITIAL_REGISTRATION_STATE: RegistrationState = { status: "idle" };

/**
 * Reads the four API fields from the form. The password is not trimmed: it is whatever was typed.
 * Any other key (the confirmation never has a name, but a crafted request could add one) is ignored.
 */
export function readRegistration(formData: FormData): RegistrationRequest {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    email: text("email"),
    name: text("name"),
    cpf: text("cpf"),
    password: String(formData.get("password") ?? ""),
  };
}

/** Required fields and the password length, worded as the API words them. */
export function validateRegistration(input: RegistrationRequest): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.email) errors.email = "Informe o seu e-mail.";
  if (!input.name) errors.name = "Informe o seu nome completo.";
  if (!input.cpf) errors.cpf = "Informe o seu CPF.";
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `A senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  return errors;
}

/** The confirmation check. Exact comparison: spaces count. Runs in the browser only. */
export function confirmationError(password: string, confirm: string): string | null {
  if (!confirm) return "Confirme a sua senha.";
  if (confirm !== password) return "As senhas não conferem.";
  return null;
}
