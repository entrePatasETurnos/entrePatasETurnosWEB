import "server-only";
import { apiFetch } from "./api";

/** Representations from the API's spec 030 (`specs/030-accommodation-booking/contracts/rest-api.md`). */

export type BookingStatus = "registered" | "approved" | "denied" | "completed";

export const BOOKING_STATUSES: BookingStatus[] = ["registered", "approved", "denied", "completed"];

export type Link = { href: string; method?: string };

export type Booking = {
  id: number;
  ownerId: number;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  pets: { id: number; name: string }[];
  review: { reviewerId: number | null; reviewedAt: string; denialReason: string | null } | null;
  completion: { completedById: number | null; completedAt: string } | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Hypermedia links. The API only includes an action when it is allowed right now, for this
   * caller: `approve`/`deny` appear only on a booking an administrator may review. So the UI shows
   * a button when, and only when, its link is present, and never re-implements the API's rules.
   */
  _links: Partial<Record<"self" | "update" | "delete" | "approve" | "deny" | "complete", Link>>;
};

export type BookingPage = {
  items: Booking[];
  page: { number: number; size: number; totalItems: number; totalPages: number };
};

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as string[]).includes(value);
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** Administrators only: every account's bookings, newest first. */
export function listAllBookings(token: string, opts: { status?: BookingStatus; page?: number; size?: number } = {}) {
  return apiFetch<BookingPage>(`/v1/accommodation-bookings${query(opts)}`, { token });
}

/** The caller's own bookings. */
export function listMyBookings(token: string, opts: { status?: BookingStatus; page?: number; size?: number } = {}) {
  return apiFetch<BookingPage>(`/v1/accommodation-bookings/me${query(opts)}`, { token });
}

/** How many bookings are in each status, for the filter counts (one small request per status). */
export async function countByStatus(token: string): Promise<Record<BookingStatus, number>> {
  const pages = await Promise.all(
    BOOKING_STATUSES.map((status) => listAllBookings(token, { status, size: 1 })),
  );
  return Object.fromEntries(
    BOOKING_STATUSES.map((status, i) => [status, pages[i].page.totalItems]),
  ) as Record<BookingStatus, number>;
}

export function approveBooking(token: string, id: number) {
  return apiFetch<Booking>(`/v1/accommodation-bookings/${id}/approve`, { method: "PUT", token });
}

export function denyBooking(token: string, id: number, reason: string) {
  return apiFetch<Booking>(`/v1/accommodation-bookings/${id}/deny`, {
    method: "PUT",
    token,
    body: { reason },
  });
}

export function completeBooking(token: string, id: number) {
  return apiFetch<Booking>(`/v1/accommodation-bookings/${id}/complete`, { method: "PUT", token });
}
