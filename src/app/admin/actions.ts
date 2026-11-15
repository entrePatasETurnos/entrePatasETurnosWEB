"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { approveBath, completeBath, denyBath } from "@/lib/baths";
import { approveBooking, completeBooking, denyBooking } from "@/lib/bookings";
import type { Service } from "@/lib/pendencies";

/**
 * Server Actions: functions that run on the server, called from forms in the browser.
 * Each one checks the session again before doing anything. A form can be called by anyone
 * who can send a request, so the caller's role cannot be trusted from the page.
 *
 * `service` says which API an item belongs to: hotel bookings (API spec 030) or bath appointments
 * (API spec 032). The rules themselves stay in the API; this only picks the endpoint.
 */

export type ActionState = { error: string } | null;

/** One item to approve in "Aprovar todas". */
export type ActionTarget = { service: Service; id: number };

const MESSAGES: Record<Service, Record<string, string>> = {
  hotel: {
    insufficient_capacity: "Não há vagas suficientes no hotel nesse período.",
    pet_already_booked: "Um dos pets já tem outra reserva nesse período.",
    own_booking_review_forbidden: "Você não pode revisar uma reserva sua.",
    invalid_status_transition: "Esta reserva mudou de situação. Atualize a página.",
    booking_not_found: "Reserva não encontrada. Ela pode ter sido apagada pelo tutor.",
    capacity_not_configured:
      "A capacidade do hotel não está configurada na API (ENTREPATASETURNOS_ACCOMMODATION_CAPACITY).",
  },
  bath: {
    insufficient_capacity: "Esse horário de banho já está ocupado por outro banho aprovado.",
    pet_already_scheduled: "Esse pet já tem outro banho nesse horário.",
    own_appointment_review_forbidden: "Você não pode revisar o banho de um pet seu.",
    invalid_status_transition: "Este banho mudou de situação. Atualize a página.",
    appointment_not_found: "Banho não encontrado. Ele pode ter sido cancelado pelo tutor.",
    schedule_not_configured: "Os horários de banho não estão configurados na API (entrepataseturnos.bath.*).",
  },
};

const ACTIONS = {
  hotel: { approve: approveBooking, deny: denyBooking, complete: completeBooking },
  bath: { approve: approveBath, deny: denyBath, complete: completeBath },
} as const;

function isService(value: unknown): value is Service {
  return value === "hotel" || value === "bath";
}

function messageFor(service: Service, error: unknown): string {
  if (error instanceof ApiError) {
    const known = error.code ? MESSAGES[service][error.code] : undefined;
    if (known) return known;
    if (error.code === "forbidden") return "Você não tem permissão para fazer isso.";
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

export async function approveAction(
  service: Service,
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isService(service)) return { error: "Serviço desconhecido." };
  const { token } = await requireRole("ADMINISTRATOR");
  try {
    await ACTIONS[service].approve(token, id);
  } catch (error) {
    return { error: messageFor(service, error) };
  }
  redirect(withNotice(safeReturn(formData), { aviso: "aprovada" }));
}

export async function denyAction(
  service: Service,
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isService(service)) return { error: "Serviço desconhecido." };
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Escreva o motivo. O tutor vai ver essa mensagem." };
  if (reason.length > 1000) return { error: "O motivo pode ter no máximo 1000 caracteres." };

  const { token } = await requireRole("ADMINISTRATOR");
  try {
    await ACTIONS[service].deny(token, id, reason);
  } catch (error) {
    return { error: messageFor(service, error) };
  }
  redirect(withNotice(safeReturn(formData), { aviso: "recusada" }));
}

export async function completeAction(
  service: Service,
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isService(service)) return { error: "Serviço desconhecido." };
  const { token } = await requireRole("ADMINISTRATOR");
  try {
    await ACTIONS[service].complete(token, id);
  } catch (error) {
    return { error: messageFor(service, error) };
  }
  redirect(withNotice(safeReturn(formData), { aviso: "concluida" }));
}

/**
 * Approves several items one after another, each through its own service. Each approval is checked by
 * the API on its own (a place can run out halfway), so some may succeed and others not.
 */
export async function approveAllAction(
  targets: ActionTarget[],
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { token } = await requireRole("ADMINISTRATOR");
  const valid = targets
    .filter((target) => isService(target.service) && Number.isInteger(target.id) && target.id > 0)
    .slice(0, 200);
  let approved = 0;
  let firstError = "";
  for (const target of valid) {
    try {
      await ACTIONS[target.service].approve(token, target.id);
      approved++;
    } catch (error) {
      firstError ||= messageFor(target.service, error);
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
