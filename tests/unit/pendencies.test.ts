/**
 * The administrator home's ordering and emphasis (specs/006-admin-home, FR-001, FR-002, FR-004).
 */
import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/bookings";
import { pendingByCheckIn, toComplete, urgencyOf } from "@/lib/pendencies";

const NOW = new Date("2026-11-14T12:00:00Z");

function booking(id: number, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    ownerId: 7,
    status: "registered",
    checkIn: "2026-11-20T11:00:00Z",
    checkOut: "2026-11-22T21:00:00Z",
    pets: [{ id: id * 10, name: `Pet ${id}` }],
    review: null,
    completion: null,
    createdAt: "2026-11-10T10:00:00Z",
    updatedAt: "2026-11-10T10:00:00Z",
    _links: {},
    ...overrides,
  };
}

describe("urgencyOf", () => {
  it.each([
    ["a check-in that already passed", "2026-11-14T11:59:00Z", "overdue"],
    ["a check-in right now", "2026-11-14T12:00:00Z", "overdue"],
    ["a check-in in 3 hours", "2026-11-14T15:00:00Z", "soon"],
    ["a check-in just under 48 hours away", "2026-11-16T11:59:00Z", "soon"],
    ["a check-in exactly 48 hours away", "2026-11-16T12:00:00Z", null],
    ["a check-in next week", "2026-11-21T12:00:00Z", null],
  ])("marks %s", (_case, checkIn, expected) => {
    expect(urgencyOf(checkIn, NOW)).toBe(expected);
  });
});

describe("pendingByCheckIn", () => {
  it("orders by check-in, earliest first, whatever order the API used", () => {
    const items = pendingByCheckIn(
      [
        booking(1, { checkIn: "2026-11-25T11:00:00Z" }),
        booking(2, { checkIn: "2026-11-15T11:00:00Z" }),
        booking(3, { checkIn: "2026-11-18T11:00:00Z" }),
      ],
      NOW,
    );
    expect(items.map((item) => item.booking.id)).toEqual([2, 3, 1]);
    expect(items.map((item) => item.urgency)).toEqual(["soon", null, null]);
  });

  it("breaks check-in ties by request time, then id, so the order is stable", () => {
    const same = "2026-11-20T11:00:00Z";
    const items = pendingByCheckIn(
      [
        booking(9, { checkIn: same, createdAt: "2026-11-12T10:00:00Z" }),
        booking(5, { checkIn: same, createdAt: "2026-11-11T10:00:00Z" }),
        booking(4, { checkIn: same, createdAt: "2026-11-12T10:00:00Z" }),
      ],
      NOW,
    );
    expect(items.map((item) => item.booking.id)).toEqual([5, 4, 9]);
  });

  it("keeps only bookings waiting for a decision", () => {
    const items = pendingByCheckIn(
      [booking(1), booking(2, { status: "approved" }), booking(3, { status: "denied" })],
      NOW,
    );
    expect(items.map((item) => item.booking.id)).toEqual([1]);
  });

  it("does not change the list it was given", () => {
    const input = [booking(1, { checkIn: "2026-11-25T11:00:00Z" }), booking(2, { checkIn: "2026-11-15T11:00:00Z" })];
    pendingByCheckIn(input, NOW);
    expect(input.map((b) => b.id)).toEqual([1, 2]);
  });
});

describe("toComplete", () => {
  const complete = { complete: { href: "/v1/accommodation-bookings/1/complete", method: "PUT" } };

  it("keeps approved stays the API lets the administrator complete, ended first on top", () => {
    const list = toComplete([
      booking(1, { status: "approved", checkOut: "2026-11-13T21:00:00Z", _links: complete }),
      booking(2, { status: "approved", checkOut: "2026-11-20T21:00:00Z" }),
      booking(3, { status: "approved", checkOut: "2026-11-10T21:00:00Z", _links: complete }),
      booking(4, { status: "completed", _links: complete }),
    ]);
    expect(list.map((b) => b.id)).toEqual([3, 1]);
  });
});
