/**
 * The user list's shapes and rules (specs 010 and 011).
 *
 * Client-safe on purpose (no "server-only"): the rows check the name in the browser for quick feedback
 * and show the labels, and the Server Action checks the name again before calling the API, which stays
 * the authority.
 */

export type UserRole = "CLIENT" | "ADMINISTRATOR";

export const USER_ROLES: readonly UserRole[] = ["CLIENT", "ADMINISTRATOR"];

/** The statuses the API filters by (API spec 036). An account may still carry a status not listed here. */
export type UserStatusFilter = "ACTIVE" | "PENDING_EMAIL_VERIFICATION" | "DISABLED";

export const STATUS_FILTERS: readonly UserStatusFilter[] = ["ACTIVE", "PENDING_EMAIL_VERIFICATION", "DISABLED"];

export const NAME_MAX_LENGTH = 255;

export const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: "Cliente",
  ADMINISTRATOR: "Administrador",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  PENDING_EMAIL_VERIFICATION: "Aguardando confirmação de e-mail",
  DISABLED: "Desativado",
};

/** A status the site does not know yet is shown as the API wrote it, never hidden. */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** What a row shows and edits: the API's account without its links. */
export type UserRowUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: string;
};

/** The answer of one row's save (research R5). */
export type UserRowState =
  | { status: "idle" }
  | { status: "unchanged" }
  | { status: "saved"; user: UserRowUser }
  | {
      status: "error";
      values: { name: string; role: UserRole };
      fieldErrors: { name?: string };
      /** Shown in the row's alert box. */
      formError?: string;
      /** The account no longer exists: the row offers to reload the list. */
      notFound?: boolean;
    };

export const INITIAL_USER_ROW_STATE: UserRowState = { status: "idle" };

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

/** Only what differs from what the row was showing: the body of the single PATCH (research R1). */
export function changedFields(input: UserEditInput, role: UserRole): { name?: string; role?: UserRole } {
  const changes: { name?: string; role?: UserRole } = {};
  if (input.name !== input.originalName) changes.name = input.name;
  if (role !== input.originalRole) changes.role = role;
  return changes;
}

function first(raw: unknown): unknown {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** The list's `pagina` parameter: an integer ≥ 0, 0 otherwise. */
export function parsePage(raw: unknown): number {
  const page = Number.parseInt(String(first(raw) ?? "0"), 10);
  return Number.isFinite(page) && page > 0 ? page : 0;
}

/** The list's `perfil` parameter; anything unknown means "every profile" (research R3). */
export function parseRoleFilter(raw: unknown): UserRole | undefined {
  const value = first(raw);
  return isUserRole(value) ? value : undefined;
}

/** The list's `situacao` parameter; anything unknown means "every status" (research R3). */
export function parseStatusFilter(raw: unknown): UserStatusFilter | undefined {
  const value = first(raw);
  return STATUS_FILTERS.find((status) => status === value);
}
