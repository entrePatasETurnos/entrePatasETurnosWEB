import "server-only";
import { ApiError, apiFetch } from "./api";
import type { UserRole } from "./user-edit";

/**
 * Administrators managing accounts (spec 010, contracts/api-users.md): list, read one, rename, change
 * the role. Renaming and the role change are the API's operations; nothing here decides who may do what.
 */

export type { UserRole } from "./user-edit";

export type UserStatus = "ACTIVE" | "PENDING_EMAIL_VERIFICATION" | "DISABLED" | (string & {});

export type UserSummary = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  _links?: Partial<Record<"self" | "rename" | "role", { href: string; method?: string }>>;
};

export type UserPage = {
  items: UserSummary[];
  page: { number: number; size: number; totalItems: number; totalPages: number };
};

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

const BASE = "/v1/users";

/**
 * Administrators only: accounts matching `q` (part of the name or e-mail), by name.
 *
 * Answers `null` when the API has no user list at all (a `404` on the collection): the site may be
 * deployed before the API that offers it, and the page then says "em breve" (research R2). Any other
 * failure is thrown.
 */
export async function listUsers(
  token: string,
  opts: { q?: string; page?: number; size?: number } = {},
): Promise<UserPage | null> {
  const search = new URLSearchParams();
  if (opts.q) search.set("q", opts.q);
  if (opts.page !== undefined) search.set("page", String(opts.page));
  if (opts.size !== undefined) search.set("size", String(opts.size));
  const query = search.toString();
  try {
    return await apiFetch<UserPage>(`${BASE}${query ? `?${query}` : ""}`, { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** One account, or `null` when there is no such account. */
export async function getUser(token: string, id: number): Promise<UserSummary | null> {
  try {
    return await apiFetch<UserSummary>(`${BASE}/${id}`, { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function renameUser(token: string, id: number, name: string) {
  return apiFetch<UserSummary>(`${BASE}/${id}/name`, { method: "PUT", token, body: { name } });
}

/** The API's existing role change: applied and audited in the request. */
export function changeUserRole(token: string, id: number, role: UserRole) {
  return apiFetch<unknown>(`${BASE}/${id}/role`, { method: "PUT", token, body: { role } });
}

/** The caller's own account id, to recognise "you" (research R4). */
export async function getMyId(token: string): Promise<number> {
  const me = await apiFetch<{ id: number }>(`${BASE}/me`, { token });
  return me.id;
}
