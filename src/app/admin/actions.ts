"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { approveBooking, completeBooking, denyBooking } from "@/lib/bookings";

/**
 * Server Actions: functions that run on the server, called from forms in the browser.
 * Each one checks the session again before doing anything. A form can be called by anyone
 * who can send a request, so the caller's role cannot be trusted from the page.
 */

export type ActionState = { error: string } | null;

const API_MESSAGES: Record<string, string> = {
  insufficient_capacity: "Não há vagas suficientes no hotel nesse período.",
  pet_already_booked: "Um dos pets já tem outra reserva nesse período.",
  own_booking_review_forbidden: "Você não pode revisar uma reserva sua.",
  invalid_status_transition: "Esta reserva mudou de situação. Atualize a página.",
  booking_not_found: "Reserva não encontrada. Ela pode ter sido apagada pelo tutor.",
  capacity_not_configured:
    "A capacidade do hotel não está configurada na API (ENTREPATASETURNOS_ACCOMMODATION_CAPACITY).",
  forbidden: "Você não tem permissão para fazer isso.",
};

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code && API_MESSAGES[error.code]) return API_MESSAGES[error.code];
    if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  }
  console.error("admin action failed", error);
  return "Não foi possível concluir agora. Tente novamente.";
}

/** Only ever go back to an admin URL, never to an address sent by the browser. */
function safeReturn(formData: FormData) {
  const value = String(formData.get("returnTo") ?? "");
  return value.startsWith("/admin") ? value : "/admin";
}

function withNotice(path: string, params: Record<string, string>) {
  const url = new URL(path, "http://local");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

export async function approveAction(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireRole("ADMINISTRATOR");
  try {
    await approveBooking(token, id);
  } catch (error) {
    return { error: messageFor(error) };
  }
  redirect(withNotice(safeReturn(formData), { aviso: "aprovada" }));
}

export async function denyAction(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Escreva o motivo. O tutor vai ver essa mensagem." };
  if (reason.length > 1000) return { error: "O motivo pode ter no máximo 1000 caracteres." };

  const { token } = await requireRole("ADMINISTRATOR");
  try {
    await denyBooking(token, id, reason);
  } catch (error) {
    return { error: messageFor(error) };
  }
  redirect(withNotice(safeReturn(formData), { aviso: "recusada" }));
}

export async function completeAction(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireRole("ADMINISTRATOR");
  try {
    await completeBooking(token, id);
  } catch (error) {
    return { error: messageFor(error) };
  }
  redirect(withNotice(safeReturn(formData), { aviso: "concluida" }));
}

/**
 * Approves several bookings one after another. Each approval is checked by the API on its own
 * (capacity can run out halfway), so some may succeed and others not.
 */
export async function approveAllAction(ids: number[], _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { token } = await requireRole("ADMINISTRATOR");
  const valid = ids.filter((id) => Number.isInteger(id) && id > 0).slice(0, 100);
  let approved = 0;
  let firstError = "";
  for (const id of valid) {
    try {
      await approveBooking(token, id);
      approved++;
    } catch (error) {
      firstError ||= messageFor(error);
    }
  }
  if (approved === 0 && firstError) return { error: firstError };
  redirect(
    withNotice(safeReturn(formData), {
      aviso: "lote",
      ok: String(approved),
      total: String(valid.length),
    }),
  );
}
