"use server";

import { refresh } from "next/cache";
import { ApiError } from "@/lib/api";
import { editUser, getMyId } from "@/lib/admin-users";
import { requireRole } from "@/lib/auth";
import {
  changedFields,
  isUserRole,
  readUserEdit,
  validateName,
  type UserRole,
  type UserRowState,
} from "@/lib/user-edit";

/**
 * Saving one row of the user list (spec 011, research R5–R7).
 *
 * The target id is bound on the server (`saveUserRowAction.bind(null, id)`), never read from the form.
 * Only what changed is sent, in one PATCH, so the name and the profile are saved together or not at all.
 * A profile change needs the confirmation step (`confirmRole=1`); the caller's own account is refused
 * before the API is asked (the API refuses it too).
 */

const GENERAL = "Não foi possível salvar agora. Tente novamente.";
const FORBIDDEN = "Você não tem permissão para fazer isso.";
const NOT_FOUND = "Usuário não encontrado.";
const INVALID_ROLE = "Perfil inválido.";

type ErrorState = Extract<UserRowState, { status: "error" }>;

export async function saveUserRowAction(id: number, _prev: UserRowState, formData: FormData): Promise<UserRowState> {
  const { token } = await requireRole("ADMINISTRATOR");
  const input = readUserEdit(formData);

  const role: UserRole | null = isUserRole(input.role) ? input.role : null;
  const values = {
    name: input.name,
    role: role ?? (isUserRole(input.originalRole) ? input.originalRole : "CLIENT"),
  };
  const error = (extra: Partial<Pick<ErrorState, "fieldErrors" | "formError" | "notFound">>): UserRowState => ({
    status: "error",
    values,
    fieldErrors: {},
    ...extra,
  });

  if (!role) return error({ formError: INVALID_ROLE });

  const nameError = validateName(input.name);
  if (nameError) return error({ fieldErrors: { name: nameError } });

  const changes = changedFields(input, role);
  if (changes.name === undefined && changes.role === undefined) return { status: "unchanged" };

  try {
    if ((await getMyId(token)) === id) return error({ formError: FORBIDDEN });
  } catch (failure) {
    return error(failureState(failure));
  }

  if (changes.role && !input.confirmRole) return error({ formError: "Confirme a mudança de perfil." });

  try {
    const saved = await editUser(token, id, changes);
    refresh();
    return {
      status: "saved",
      user: {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        role: isUserRole(saved.role) ? saved.role : values.role,
        status: saved.status,
      },
    };
  } catch (failure) {
    return error(failureState(failure));
  }
}

function failureState(failure: unknown): Partial<Pick<ErrorState, "fieldErrors" | "formError" | "notFound">> {
  if (failure instanceof ApiError) {
    if (failure.status === 400) {
      const fields = (failure.body as { fields?: Record<string, unknown> } | undefined)?.fields;
      if (typeof fields?.name === "string") return { fieldErrors: { name: fields.name } };
      if (fields?.role !== undefined) return { formError: INVALID_ROLE };
      return { formError: "Não foi possível salvar. Confira os dados." };
    }
    if (failure.status === 401) return { formError: "Sua sessão expirou. Entre novamente." };
    if (failure.status === 403) return { formError: FORBIDDEN };
    if (failure.status === 404) return { formError: NOT_FOUND, notFound: true };
    console.error("user row save failed", failure.status, failure.code);
  } else {
    console.error("user row save failed", failure instanceof Error ? failure.name : typeof failure);
  }
  return { formError: GENERAL };
}
