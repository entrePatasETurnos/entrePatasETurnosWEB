# Contract: API fields read by the stay card

Consumer side of entrePatasETurnosAPI's Booking representation
(API `specs/030-accommodation-booking/contracts/rest-api.md`, amended by API specs 033 and 034).

## Requests

The same requests as before this feature. None is added (spec FR-007):

| Page | Request |
|---|---|
| `/admin` (home) | `GET /v1/accommodation-bookings?status=registered&size=100`, `…?status=approved&size=100` (+ the two bath lists, unchanged) |
| `/admin/hospedagens` | `GET /v1/accommodation-bookings?status=…&page=…&size=20` (+ per-status counts, unchanged) |

## Fields read from each Booking

| Field | Since | Used for | If missing or invalid |
|---|---|---|---|
| `ownerId` | API 030 | "Tutor nº 7" | never missing |
| `ownerName` | API 033 | the name before the number | the number alone (spec FR-003) |
| `nights` | API 034 | "11 noites" | the nights part is left out (spec FR-005) |
| `checkIn`, `checkOut`, `pets`, `status`, `review`, `createdAt`, `_links` | API 030 | unchanged | unchanged |

The site **never** derives `nights` from `checkIn`/`checkOut` for these cards (spec FR-004).

## Not read

`BathAppointment` has no `ownerName`, so bath cards show the number only (spec FR-006).
