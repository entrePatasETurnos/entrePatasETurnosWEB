import "server-only";
import { ApiError, apiFetch } from "./api";
import type { BookingStatus, Link } from "./bookings";

/** Representations from entrePatasETurnosAPI spec 032 (`specs/032-grooming-appointments/contracts/rest-api.md`). */

export type BathAppointment = {
  id: number;
  ownerId: number;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  /** Null only when the pet was removed after the bath was denied or completed. */
  pet: { id: number; name: string } | null;
  review: { reviewerId: number | null; reviewedAt: string; denialReason: string | null } | null;
  completion: { completedById: number | null; completedAt: string } | null;
  createdAt: string;
  updatedAt: string;
  /** As for bookings: an action's link is present only when the API allows it now, for this caller. */
  _links: Partial<Record<"self" | "update" | "delete" | "approve" | "deny" | "complete", Link>>;
};

export type BathPage = {
  items: BathAppointment[];
  page: { number: number; size: number; totalItems: number; totalPages: number };
};

const BASE = "/v1/bath-appointments";

/**
 * Administrators only: every bath appointment, soonest first.
 *
 * Answers `null` when the API has no bath endpoints at all (a `404` on the collection): the site may be
 * deployed before the API that knows about baths, and the home then shows baths as "em breve". Any other
 * failure is thrown, so it is never mistaken for "nothing pending".
 */
export async function listAllBaths(
  token: string,
  opts: { status?: BookingStatus; page?: number; size?: number } = {},
): Promise<BathPage | null> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(opts)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  try {
    return await apiFetch<BathPage>(`${BASE}${query ? `?${query}` : ""}`, { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function approveBath(token: string, id: number) {
  return apiFetch<BathAppointment>(`${BASE}/${id}/approve`, { method: "PUT", token });
}

export function denyBath(token: string, id: number, reason: string) {
  return apiFetch<BathAppointment>(`${BASE}/${id}/deny`, { method: "PUT", token, body: { reason } });
}

export function completeBath(token: string, id: number) {
  return apiFetch<BathAppointment>(`${BASE}/${id}/complete`, { method: "PUT", token });
}
