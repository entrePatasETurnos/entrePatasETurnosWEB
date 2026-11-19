import "server-only";
import { apiFetch } from "./api";
import type { UserRole, UserStatusFilter } from "./user-edit";

/**
 * Administrators managing accounts (spec 011, contracts/api-users.md): list every account (API spec 036)
 * and change one account's name and/or role in a single request (API spec 035). Nothing here decides who
 * may do what: the API does.
 */

export type { UserRole, UserStatusFilter } from "./user-edit";
export { ROLE_LABELS, STATUS_LABELS, statusLabel } from "./user-edit";

type Link = { href: string; method?: string };

export type UserSummary = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  _links?: Partial<Record<"self" | "edit" | "change-role" | "role-change", Link>>;
};

export type UserPage = {
  items: UserSummary[];
  page: { number: number; size: number; totalItems: number; totalPages: number };
  _links?: Partial<Record<"self" | "first" | "prev" | "next" | "last", Link>>;
};

const BASE = "/v1/users";

/** Administrators only: one page of every account, in the API's alphabetical order. Failures are thrown. */
export function listUsers(
  token: string,
  opts: { role?: UserRole; status?: UserStatusFilter; page?: number; size?: number } = {},
): Promise<UserPage> {
  const search = new URLSearchParams();
  if (opts.role) search.set("role", opts.role);
  if (opts.status) search.set("status", opts.status);
  if (opts.page !== undefined) search.set("page", String(opts.page));
  if (opts.size !== undefined) search.set("size", String(opts.size));
  const query = search.toString();
  return apiFetch<UserPage>(`${BASE}${query ? `?${query}` : ""}`, { token });
}

/** Changes the name, the role, or both, atomically: both applied or neither (API spec 035). */
export function editUser(token: string, id: number, changes: { name?: string; role?: UserRole }) {
  return apiFetch<UserSummary>(`${BASE}/${id}`, { method: "PATCH", token, body: changes });
}

/** The caller's own account id, to recognise "you". */
export async function getMyId(token: string): Promise<number> {
  const me = await apiFetch<{ id: number }>(`${BASE}/me`, { token });
  return me.id;
}
