/**
 * The user edit form's shapes and rules (spec 010).
 *
 * Client-safe on purpose (no "server-only"): the form checks the name in the browser for quick feedback,
 * and the Server Action checks it again before calling the API, which stays the authority.
 */

export type UserRole = "CLIENT" | "ADMINISTRATOR";

export const USER_ROLES: UserRole[] = ["CLIENT", "ADMINISTRATOR"];

export const NAME_MAX_LENGTH = 255;
export const SEARCH_MAX_LENGTH = 100;

export type UserEditValues = { name: string; role: UserRole };

export type UserEditState =
  | { status: "idle" }
  | {
      status: "error";
      values: UserEditValues;
      fieldErrors: { name?: string };
      /** Shown above the button. */
      formError?: string;
      /** The rename went through but the role change did not: this is the name now saved. */
      saved?: { name: string };
    };

export const INITIAL_USER_EDIT_STATE: UserEditState = { status: "idle" };

export function isUserRole(value: unknown): value is UserRole {
  return value === "CLIENT" || value === "ADMINISTRATOR";
}

export type UserEditInput = {
  name: string;
  /** Exactly what was sent; checked with `isUserRole` before use. */
  role: string;
  originalName: string;
  originalRole: string;
  confirmRole: boolean;
};

export function readUserEdit(formData: FormData): UserEditInput {
  const text = (key: string) => String(formData.get(key) ?? "");
  return {
    name: text("name").trim(),
    role: text("role"),
    originalName: text("originalName").trim(),
    originalRole: text("originalRole"),
    confirmRole: text("confirmRole") === "1",
  };
}

/** The API's name rule: required after trimming, at most 255 characters. */
export function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Informe o nome completo.";
  if (trimmed.length > NAME_MAX_LENGTH) return `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
  return undefined;
}

/** The list's `busca` parameter: trimmed, at most 100 characters, empty for "everyone". */
export function normalizeSearch(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim().slice(0, SEARCH_MAX_LENGTH) : "";
}

/** The list's `pagina` parameter: an integer ≥ 0, 0 otherwise. */
export function parsePage(raw: unknown): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(page) && page > 0 ? page : 0;
}
