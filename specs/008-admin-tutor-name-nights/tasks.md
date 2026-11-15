# Tasks: Tutor name and API nights on the administrator home

**Input**: Design documents from `/specs/008-admin-tutor-name-nights/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-fields.md, quickstart.md

**Tests**: Requested by spec FR-009. They are unit tests of the pure helpers (research R3), followed by a
browser check.

**Organization**: by user story. US1 (tutor name) and US2 (API nights) are both P1 and independent: each
touches its own helper and its own line of the card. They share `BookingCard.tsx` and the new test file,
so their edits to those two files are sequential.

Paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup is needed. The project, dependencies and test runner already exist, and nothing is added (plan,
Technical Context).

---

## Phase 2: Foundational (blocks both stories)

- [X] T001 Extend the `Booking` type in `src/lib/bookings.ts` with two optional fields, placed right after
  `ownerId: number;` and `checkOut: string;` respectively:
  - `ownerName?: string;` with the doc comment `/** The owner's current account name (API spec 033). Absent on an older API. */`
  - `nights?: number;` with the doc comment `/** Calendar nights in Brasília time (API spec 034). Absent on an older API; never computed here. */`

  Do not touch `BathAppointment` in `src/lib/baths.ts` (spec FR-006).
- [X] T002 Create `tests/unit/format.test.ts`.
  - Use Vitest (`import { describe, expect, it } from "vitest"`) and import from `@/lib/format`.
  - Put a header comment naming spec 008.
  - Leave the two `describe` blocks empty for now: `tutorLabel` (filled by T003) and `nightsLabel` (filled
    by T007).

**Checkpoint**: `npx tsc --noEmit` passes (the new fields are optional, so nothing else breaks).

---

## Phase 3: User Story 1 - The administrator sees who each stay belongs to (Priority: P1) 🎯 MVP

**Goal**: every stay card on `/admin` and `/admin/hospedagens` shows "Ana Souza · Tutor nº 7", and
"Tutor nº 7" alone when the API sends no name.

**Independent Test**: `tests/unit/format.test.ts` → `tutorLabel` passes. In the browser, a pending stay
owned by a named client shows the name and the number together (quickstart §2 steps 1–3).

- [X] T003 [US1] In `tests/unit/format.test.ts`, fill `describe("tutorLabel")` with the rows of
  `specs/008-admin-tutor-name-nights/data-model.md` § Derived display values:
  - `tutorLabel(7, "Ana Souza")` equals `{ name: "Ana Souza", number: "Tutor nº 7" }`;
  - `tutorLabel(7, undefined)` equals `{ name: null, number: "Tutor nº 7" }`;
  - `tutorLabel(7, "   ")` equals `{ name: null, number: "Tutor nº 7" }`;
  - `tutorLabel(7, "  Ana Souza ")` gives a trimmed `name` of `"Ana Souza"`.

  Run `npm test` and confirm these fail (the function doesn't exist yet).
- [X] T004 [US1] In `src/lib/format.ts`, add and export
  `tutorLabel(ownerId: number, ownerName?: string | null): { name: string | null; number: string }`.
  - `number` is `` `Tutor nº ${ownerId}` ``.
  - `name` is `ownerName.trim()` when it is a string that is non-empty after trimming, and `null` otherwise
    (research R1).
  - Add a doc comment: `/** "Ana Souza" + "Tutor nº 7". The number stays because names repeat (spec 008). */`

  Run `npm test` and expect T003 to pass.
- [X] T005 [US1] In `src/app/admin/BookingCard.tsx`:
  - Import `tutorLabel` from `@/lib/format`.
  - Compute `const tutor = tutorLabel(booking.ownerId, booking.ownerName);`.
  - Replace the comment `{/* The API sends only the owner's id, never a name or e-mail (privacy by design). */}`
    with `{/* Name from API spec 033's ownerName; the number stays because names repeat. */}` (research R6).
  - Replace the line `<UserIcon size={14} /> Tutor nº {booking.ownerId}` inside `<span className={styles.owner}>` with:
    `<UserIcon size={14} />`, then `{tutor.name && <span className={styles.ownerName}>{tutor.name}</span>}`,
    then `{tutor.name && <span aria-hidden="true">·</span>}`, then
    `<span className={styles.ownerNumber}>{tutor.number}</span>`.
- [X] T006 [US1] In `src/app/admin/admin.module.css`, make the tutor line wrap (research R4):
  - Change `.owner` to `display: flex; flex-wrap: wrap; min-width: 0;` and keep its `align-items`, `gap`,
    `font-size` and `color`.
  - Add `.ownerName { overflow-wrap: anywhere; font-weight: 600; color: var(--text-heading); }`, using the
    heading color token defined in `src/app/globals.css`.
  - Add `.ownerNumber { white-space: nowrap; }`.

**Checkpoint**: US1 is done. `npm test` passes, and both admin pages show the name before the number.

---

## Phase 4: User Story 2 - The number of nights comes from the API (Priority: P1)

**Goal**: the stay card shows the API's `nights` ("11 noites", "1 noite", "0 noites"). It leaves the
nights out when the field is missing, and never computes it itself.

**Independent Test**: `tests/unit/format.test.ts` → `nightsLabel` passes. `grep nightsBetween
src/app/admin/BookingCard.tsx` prints nothing. In the browser, an 11-night stay says "11 noites".

- [X] T007 [US2] In `tests/unit/format.test.ts`, fill `describe("nightsLabel")` with the data-model rows:
  - `11` → `"11 noites"`, `1` → `"1 noite"`, `0` → `"0 noites"`;
  - `undefined`, `null`, `-1`, `1.5`, `Number.NaN` → `null`;
  - `"3"` → `null`, passed as `"3" as unknown as number` to prove a wrong type from the API is not shown.

  Run `npm test` and confirm these fail.
- [X] T008 [US2] In `src/lib/format.ts`, add and export
  `nightsLabel(nights?: number | null): string | null`.
  - It returns `plural(nights, "noite", "noites")` when `typeof nights === "number" && Number.isInteger(nights) && nights >= 0`, and `null` otherwise.
  - Add a doc comment: `/** The API's own count (API spec 034); null when the API did not send a usable one. Never derived from dates. */`
  - Also update the doc comment of `nightsBetween` to: `/** Calendar nights between check-in and check-out, counted in Brasília time. Customer area only: administrator cards read the API's nights (spec 008). */` (research R5).

  Run `npm test` and expect T007 to pass.
- [X] T009 [US2] In `src/app/admin/BookingCard.tsx`:
  - Remove `nightsBetween` from the `@/lib/format` import and add `nightsLabel`.
  - Replace `const nights = nightsBetween(booking.checkIn, booking.checkOut);` with
    `const nights = nightsLabel(booking.nights);`.
  - Change the summary line from `Hospedagem · {plural(nights, "noite", "noites")} · {plural(booking.pets.length, "pet", "pets")}` to
    `Hospedagem · {nights && <>{nights} · </>}{plural(booking.pets.length, "pet", "pets")}` (spec FR-004, FR-005).
  - Keep `plural` imported, because it is still used for pets.
- [X] T010 [US2] Verify FR-004: `grep -n "nightsBetween" src/app/admin/` prints nothing, and
  `grep -rn "nightsBetween" src` lists only `src/lib/format.ts` and `src/app/app/page.tsx`.

**Checkpoint**: both stories are done.

---

## Phase 5: Polish & Cross-Cutting

- [X] T011 [P] Update `README.md`, if it describes the administrator cards (search for "Tutor nº" or
  "noites"), to say that the stay cards show the tutor's name (API spec 033) and the API's nights (API
  spec 034). If it doesn't mention them, leave it unchanged.
- [X] T012 [P] Mark the spec implemented: in `specs/008-admin-tutor-name-nights/spec.md`, set
  `**Status**: Implemented`.
- [X] T013 Run every check from `specs/008-admin-tutor-name-nights/quickstart.md` §1: `npm run lint`,
  `npx tsc --noEmit`, `npm test` and `npm run build`. All must pass.
- [X] T014 Do the browser check in `specs/008-admin-tutor-name-nights/quickstart.md` §2 (steps 1–6, at
  1280 px and 390 px, keyboard Tab through the actions) against a local API. If no local API can be run,
  record that here as skipped, with the reason, and list what the unit tests cover instead.
  **Skipped during implementation**: signing in as an administrator needs Google OAuth in a real browser
  against a local API, which could not be done from the implementation session. It is left for review.
  Covered instead:
  - `tests/unit/format.test.ts` (7 tests) covers every row of data-model.md § Derived display values: name
    before number, number alone, blank/trimmed names, 11/1/0 nights, and absent or invalid `nights`.
  - The T010 grep shows `BookingCard` no longer computes nights.
  - lint, `tsc`, 52/52 unit tests and the production build pass.

  Not covered: the 390 px wrap of a long name, and keyboard Tab order. The markup adds no interactive
  element.

---

## Dependencies & Execution Order

- **T001 and T002**, the foundational tasks, come before both stories. They touch different files, so they
  can run in parallel, but each is only a few lines.
- **US1 (T003–T006)** and **US2 (T007–T010)** are independent in behaviour, but both edit
  `tests/unit/format.test.ts`, `src/lib/format.ts` and `src/app/admin/BookingCard.tsx`, so run them one
  after the other: US1 first, then US2.
  - Within each story the order is test, then helper, then card. US1 also includes CSS (T006), which
    touches its own file.
- **Polish (T011–T014)** comes after both stories. T011 and T012 can run in parallel. T013 comes before T014.

### Parallel opportunities

- T001 ∥ T002.
- T006 (CSS) ∥ T005, which edit different files in the same story.
- T011 ∥ T012.

### Parallel example

```text
Foundational:  T001 (bookings.ts type)  ∥  T002 (format.test.ts skeleton)
US1:           T005 (BookingCard.tsx)   ∥  T006 (admin.module.css)
Polish:        T011 (README)            ∥  T012 (spec status)
```

## Implementation Strategy

- **MVP**: Phase 2 and Phase 3 (US1). The tutor's name ships on its own. It already works in production,
  because API spec 033 is deployed.
- **Then US2**. It's safe to ship before API spec 034 reaches production: without `nights`, the card simply
  omits the count (FR-005).
- Commit per story, and open the PR against `main` once T013 passes.
- The branch starts from spec 007's merge (`4a0d6f7`), so its PR also brings spec 007 to `main`. Say so in
  the PR description, unless spec 007 has been merged to `main` separately first.
