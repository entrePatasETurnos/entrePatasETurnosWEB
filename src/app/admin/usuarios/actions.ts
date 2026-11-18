"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { changeUserRole, getMyId, renameUser } from "@/lib/admin-users";
import { requireRole } from "@/lib/auth";
import { writeUserName } from "@/lib/session";
import {
  isUserRole,
  readUserEdit,
  validateName,
  type UserEditState,
  type UserEditValues,
} from "@/lib/user-edit";

/**
 * Saving the user edit form (spec 010, research R4–R6).
 *
 * The target id is bound on the server (`saveUserAction.bind(null, id)`), never read from the form.
 * Only what changed is sent: the name first, then the role. A role change needs the confirmation step
 * (`confirmRole=1`) and is refused for the caller's own account, whatever the page showed.
 */

const GENERAL = "Não foi possível salvar agora. Tente novamente.";
const SELF_ROLE = "Você não pode alterar o seu próprio perfil.";
const NOT_FOUND = "Usuário não encontrado.";

export async function saveUserAction(id: number, _prev: UserEditState, formData: FormData): Promise<UserEditState> {
  const { token } = await requireRole("ADMINISTRATOR");
  const input = readUserEdit(formData);

  const role = isUserRole(input.role) ? input.role : null;
  const values: UserEditValues = {
    name: input.name,
    role: role ?? (isUserRole(input.originalRole) ? input.originalRole : "CLIENT"),
  };
  const error = (extra: Omit<Extract<UserEditState, { status: "error" }>, "status" | "values" | "fieldErrors"> & {
    fieldErrors?: { name?: string };
  }): UserEditState => ({ status: "error", values, fieldErrors: extra.fieldErrors ?? {}, ...extra });

  if (!role) return error({ formError: "Perfil inválido." });

  const nameError = validateName(input.name);
  if (nameError) return error({ fieldErrors: { name: nameError } });

  const nameChanged = input.name !== input.originalName;
  const roleChanged = role !== input.originalRole;
  if (!nameChanged && !roleChanged) return error({ formError: "Nada para salvar." });

  // Asked at most once per save: both the self-rename cookie and the self-role check need it.
  let myId: number | undefined;
  const isSelf = async () => {
    myId ??= await getMyId(token);
    return myId === id;
  };

  if (roleChanged) {
    try {
      if (await isSelf()) return error({ formError: SELF_ROLE });
    } catch (failure) {
      return error({ formError: messageFor(failure) });
    }
    if (!input.confirmRole) return error({ formError: "Confirme a mudança de perfil." });
  }

  if (nameChanged) {
    try {
      await renameUser(token, id, input.name);
    } catch (failure) {
      return error(renameFailure(failure));
    }
    try {
      if (await isSelf()) writeUserName(await cookies(), input.name);
    } catch {
      // The rename is saved; the header shows the old name until the next session renewal.
    }
  }

  if (roleChanged) {
    try {
      await changeUserRole(token, id, role);
    } catch (failure) {
      const reason =
        failure instanceof ApiError && failure.code === "own_role_change_forbidden"
          ? SELF_ROLE
          : messageFor(failure, { 400: "Perfil inválido." });
      return nameChanged
        ? error({ saved: { name: input.name }, formError: `Nome salvo. O perfil não foi alterado: ${reason}` })
        : error({ formError: reason });
    }
  }

  // Outside every try: `redirect` works by throwing.
  redirect(`/admin/usuarios/${id}?aviso=salvo`);
}

function renameFailure(failure: unknown): { fieldErrors?: { name?: string }; formError?: string } {
  if (failure instanceof ApiError && failure.status === 400) {
    const body = failure.body as { fields?: { name?: unknown }; message?: unknown } | undefined;
    if (typeof body?.fields?.name === "string") return { fieldErrors: { name: body.fields.name } };
    if (typeof body?.message === "string" && body.message.trim()) return { formError: body.message };
  }
  return { formError: messageFor(failure) };
}

function messageFor(failure: unknown, byStatus: Record<number, string> = {}): string {
  if (failure instanceof ApiError) {
    if (byStatus[failure.status]) return byStatus[failure.status];
    if (failure.status === 404) return NOT_FOUND;
    if (failure.status === 401) return "Sua sessão expirou. Entre novamente.";
    if (failure.status === 403) return "Você não tem permissão para fazer isso.";
    console.error("user edit failed", failure.status, failure.code);
  } else {
    console.error("user edit failed", failure instanceof Error ? failure.name : typeof failure);
  }
  return GENERAL;
}
