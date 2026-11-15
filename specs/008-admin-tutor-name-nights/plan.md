# Implementation Plan: Tutor name and API nights on the administrator home

**Branch**: `008-admin-tutor-name-nights` (based on spec 007's merge, `4a0d6f7`) | **Date**: 2026-11-15 |
**Spec**: [spec.md](./spec.md)

## Summary

The stay card (`BookingCard`, used by the home and by `/admin/hospedagens`) changes in two ways:

- it reads `ownerName` and `nights` from the booking the API already returns;
- it stops computing nights from the dates.

Two pure helpers in `src/lib/format.ts` decide what the card shows, so the decision is unit-tested without
rendering. `tutorLabel` gives "Ana Souza · Tutor nº 7", or "Tutor nº 7" alone when the name is missing.
`nightsLabel` gives "11 noites" or "1 noite", and `null` when `nights` is missing or not a whole number ≥ 0.

The `Booking` type gains both fields as optional, because the site may meet an API older than specs
033 and 034 (spec FR-003, FR-005). Bath cards, requests, ordering, actions and the customer area are
unchanged.

## Technical Context

**Language/Version**: TypeScript 5, Node.js ≥ 22

**Primary Dependencies**: Next.js 16.4.5, React 19.3.0. Nothing is added.

**Storage**: none. The site keeps no data, and the API is the only source (constitution II).

**Testing**:
- Vitest, Node environment, `tests/unit/*.test.ts`. Card components are not rendered in tests; their
  decisions live in pure helpers, as `pendencies.ts` does for ordering (research R3).
- Browser check against a local API, at 1280 px and 390 px.

**Target Platform**: the existing standalone Next.js server behind NGINX.

**Project Type**: web application, a backend-for-frontend.

**Performance Goals**: no new request (spec FR-007, SC-003). The fields arrive in the answers the home
already fetches.

**Constraints**:
- `ownerName` and `nights` may be absent (older API), and the page must render either way.
- The card must never compute nights itself (FR-004), so `nightsBetween` must not be used by
  `BookingCard`. It stays in `format.ts` only for the customer area (`src/app/app/page.tsx`), which is out
  of scope (spec Assumptions).
- A long tutor name must not push the actions off the card or hide the number (spec Edge Cases).

**Scale/Scope**: 4 source files (`lib/bookings.ts`, `lib/format.ts`, `admin/BookingCard.tsx`,
`admin/admin.module.css`) and 1 new test file.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | How compliance is verified |
|---|---|---|
| I. Responsive, keyboard | Yes | Browser check at 1280 px and 390 px with a 60-character tutor name: no horizontal scroll; the name wraps and "Tutor nº" stays visible; the actions stay on the card. No new interactive element, so keyboard use is unchanged (Tab still reaches every action). |
| II. API as backend | Yes | Nights come from the API's `nights`; `BookingCard` no longer imports `nightsBetween` (checked by review and by a grep in the tasks). Unit tests: `nightsLabel` shows exactly the value given, and `null` when it is absent. Loading, failure and empty states are untouched (specs 006/007). |
| III. Access rules | Yes, unchanged | No new route or action. The pages still call `requireRole("ADMINISTRATOR")`; the name is shown only where the API already returns the booking to an administrator. |
| IV. Plans document verification | Yes | This table. |

**Result**: PASS. Post-design re-check: PASS (the design adds no request, route, action or dependency).

## Project Structure

### Documentation (this feature)

```text
specs/008-admin-tutor-name-nights/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api-fields.md     # what the site reads from the API, and when it may be missing
├── checklists/requirements.md
└── tasks.md                    # /speckit-tasks
```

### Source Code (repository root)

```text
src/lib/bookings.ts             Booking type: + ownerName?: string, + nights?: number
src/lib/format.ts               + tutorLabel(ownerId, ownerName?), + nightsLabel(nights?)
src/app/admin/BookingCard.tsx   uses both helpers; no nightsBetween; stale "id only" comment removed
src/app/admin/admin.module.css  .owner wraps long names (min-width: 0, overflow-wrap)
tests/unit/format.test.ts       new: both helpers, including absent and invalid values
```

**Structure Decision**: the existing single Next.js app. The change stays in the stay card and its
helpers. `BathCard.tsx` is untouched (spec FR-006).

## Complexity Tracking

None. There are no constitution violations.
