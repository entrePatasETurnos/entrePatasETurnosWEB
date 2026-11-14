/**
 * What needs an administrator now. Pure functions (no I/O), so they are unit-tested directly.
 *
 * The rules about what an administrator MAY do stay in the API: "to complete" is exactly the
 * bookings that carry the API's `complete` link. This file only decides order and emphasis.
 */
import type { Booking } from "./bookings";

/** A pending booking whose check-in is closer than this is marked urgent. */
export const URGENT_WITHIN_MS = 48 * 60 * 60 * 1000;

/** `overdue`: the check-in has already passed and nobody decided. `soon`: under 48 hours away. */
export type Urgency = "overdue" | "soon" | null;

export type PendingItem = { booking: Booking; urgency: Urgency };

export function urgencyOf(checkIn: string, now: Date): Urgency {
  const remaining = Date.parse(checkIn) - now.getTime();
  if (remaining <= 0) return "overdue";
  if (remaining < URGENT_WITHIN_MS) return "soon";
  return null;
}

function byCheckIn(a: Booking, b: Booking) {
  return (
    Date.parse(a.checkIn) - Date.parse(b.checkIn) ||
    Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
    a.id - b.id
  );
}

/**
 * Bookings waiting for approval, soonest check-in first (the API may return them in another order;
 * API spec 031 changes it, so the site does not depend on it).
 */
export function pendingByCheckIn(bookings: Booking[], now: Date): PendingItem[] {
  return bookings
    .filter((booking) => booking.status === "registered")
    .sort(byCheckIn)
    .map((booking) => ({ booking, urgency: urgencyOf(booking.checkIn, now) }));
}

/** Approved stays the API lets the administrator complete, the one that ended first on top. */
export function toComplete(bookings: Booking[]): Booking[] {
  return bookings
    .filter((booking) => booking.status === "approved" && Boolean(booking._links.complete))
    .sort((a, b) => Date.parse(a.checkOut) - Date.parse(b.checkOut) || a.id - b.id);
}
