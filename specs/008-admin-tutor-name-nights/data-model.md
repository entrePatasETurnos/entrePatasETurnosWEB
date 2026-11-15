# Data Model: Tutor name and API nights on the administrator home

The site stores nothing. This document describes what it **reads** and how it derives what the card shows.

## Booking (as received, `src/lib/bookings.ts`)

Unchanged fields stay as they are. Two fields are added:

| Field | Type | Source | When absent |
|---|---|---|---|
| `ownerName` | `string`, optional | API spec 033: the owner's current account name | API older than 033, or an empty/blank value |
| `nights` | `number`, optional | API spec 034: calendar nights in Brasília time | API older than 034, or a value that is not a whole number ≥ 0 |

`BathAppointment` (`src/lib/baths.ts`) is unchanged and has no `ownerName` (spec FR-006).

## Derived display values (`src/lib/format.ts`, pure)

| Function | Input | Output |
|---|---|---|
| `tutorLabel(ownerId, ownerName?)` | `7, "Ana Souza"` | `{ name: "Ana Souza", number: "Tutor nº 7" }` |
| | `7, undefined` / `7, "  "` | `{ name: null, number: "Tutor nº 7" }` |
| `nightsLabel(nights?)` | `11` | `"11 noites"` |
| | `1` | `"1 noite"` |
| | `0` | `"0 noites"` |
| | `undefined`, `null`, `-1`, `1.5`, `"3"` | `null` (the card omits the nights part) |

The card writes `name · number` when `name` is present, and `number` alone otherwise. It writes
"Hospedagem · {nightsLabel} · {pets}" when `nightsLabel` is present, and "Hospedagem · {pets}" otherwise.
