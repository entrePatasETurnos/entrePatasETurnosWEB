# Feature Specification: Tutor name and API nights on the administrator home

**Feature Branch**: `008-admin-tutor-name-nights`

**Created**: 2026-11-15

**Status**: Implemented

**Input**: User description: "When my admin user open home, fetch this: https://api.entrepataseturnos.com/v1/accommodation-bookings to render the entire screen, if one field on screen do not in API let me know. I wanna the Nome do tutor besides the number of tutor. And get the number of nights from the API response as well"

## Overview

The administrator home (`/admin`, "Pendências", specs 006 and 007) already loads its hotel stays from the
accommodation bookings list. Two values on each stay card do not use what that list now provides:

- **The tutor** appears as "Tutor nº 7" only. The bookings list has carried the owner's name (`ownerName`)
  since entrePatasETurnosAPI spec 033, which is in production. The administrator wants the name shown next
  to the number.
- **The number of nights** is worked out by the site from the check-in and check-out dates.
  entrePatasETurnosAPI spec 034 adds `nights` to every booking; the site must show that value instead of
  computing its own.

This feature also records, field by field, where everything on the home comes from (see **Screen
inventory**), as the request asked to be told which fields the bookings list does not provide.

## Screen inventory

What the administrator home shows, and where each value comes from once this feature ships.

**From the accommodation bookings list** (`GET /v1/accommodation-bookings`, statuses registered and
approved):

| On screen | Source |
|---|---|
| Pet names, avatar initial | `pets[].name` |
| Tutor name **(new)** | `ownerName` |
| Tutor number | `ownerId` |
| Check-in → check-out | `checkIn`, `checkOut` |
| Number of nights **(changed: from the API)** | `nights` |
| Number of pets | count of `pets` |
| Status badge | `status` |
| Denial reason | `review.denialReason` |
| "Solicitada em" | `createdAt` |
| Approve / deny / complete buttons, "Reserva sua" note | which `_links` are present |
| "Hospedagens para aprovar" count, "Para aprovar" total (hotel part) | `page.totalItems` of the registered list |
| "Para concluir" (hotel part) | approved bookings carrying a `complete` link |
| Urgency badges ("Check-in já passou", "em menos de 48 h") | `checkIn` compared with the current time |
| Order of the lists | `checkIn` / `checkOut` |

**Not from the accommodation bookings list.** These are the fields the request asked to be told about:

| On screen | Where it comes from | Note |
|---|---|---|
| Every bath card, "Banhos para aprovar", the bath part of the totals | The bath appointments list (`/v1/bath-appointments`, spec 007) | Baths are a different service with their own list; the bookings list cannot provide them. |
| Bath tutor name | **Nowhere yet**: the bath appointments list has no owner name | Bath cards keep "Tutor nº" only (FR-006) |
| Bath length ("1 h") | Computed by the site from the bath's start and end | The bath list has no duration field; out of scope here. |
| Greeting with the administrator's first name (header) | The signed-in session | Not booking data. |
| "Painel do administrador · Vicente Pires · Brasília", menu, titles, explanations | Fixed text in the site | |
| "Adestramento — Em breve" card and panel | Fixed text | The API has no training service. |
| Confirmation after an action ("Reserva aprovada…") | Set by the site after the action | |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The administrator sees who each stay belongs to (Priority: P1)

Bruno opens the home to decide on today's requests. Each hotel stay shows the tutor's name next to their
number, for example "Ana Souza · Tutor nº 7", so he knows who is asking without looking anything up.

**Why this priority**: It is the main request.

**Independent Test**: With a pending stay whose owner is "Ana Souza" (id 7), open the home as an
administrator. The card shows "Ana Souza" and "nº 7" together.

**Acceptance Scenarios**:

1. **Given** a pending stay owned by "Ana Souza" (id 7), **When** an administrator opens the home, **Then**
   its card shows the name "Ana Souza" and the number 7 together.
2. **Given** an approved stay waiting to be completed, **When** the home lists it under "Para concluir",
   **Then** its card shows the tutor's name and number the same way.
3. **Given** the tutor renamed their account, **When** the home is opened again, **Then** the card shows
   the new name.
4. **Given** the full hotel list (`/admin/hospedagens`), which uses the same card, **When** an administrator
   opens it, **Then** each stay shows the tutor's name and number too.

---

### User Story 2 - The number of nights comes from the API (Priority: P1)

The home shows "Hospedagem · 11 noites" on a stay from 7 to 18 November. The number is the one the API
gives, so the home, the full hotel list and any other client always agree.

**Why this priority**: The request names it, and the API is the single place business rules live
(constitution Principle II).

**Independent Test**: With a stay whose API answer carries `nights: 11`, the card says "11 noites". With a
test answer whose `nights` deliberately differs from the dates, the card shows the API's number, proving the
site does not compute its own.

**Acceptance Scenarios**:

1. **Given** a stay the API answers with `nights: 11`, **When** the home renders it, **Then** the card says
   "11 noites".
2. **Given** a stay with `nights: 1`, **When** it is rendered, **Then** the card says "1 noite" (singular).
3. **Given** a same-day stay with `nights: 0`, **When** it is rendered, **Then** the card says "0 noites".
4. **Given** an answer without `nights` (an API version older than spec 034), **When** the home renders the
   stay, **Then** the card shows the dates and pet count but no number of nights. It never shows a number
   the site computed itself, and the page does not fail.

### Edge Cases

- **Two tutors with the same name**: the number tells them apart, which is why both stay visible.
- **Very long names**: the name wraps or is shortened on narrow screens without pushing the actions off the
  card; the number stays visible.
- **Answer without `ownerName`** (an API older than spec 033): the card shows "Tutor nº 7" exactly as today.
- **Administrator's own stay**: shows their own name, with the existing "Reserva sua" note unchanged.
- **Baths in the same list**: bath cards keep "Tutor nº 7" only, since their list has no owner name
  (FR-006). Stay cards and bath cards therefore differ in this one line until the API adds the name.
- **Loading, failure and empty states**: unchanged from specs 006 and 007.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every hotel stay card on the administrator home MUST show the tutor's name (`ownerName`) next
  to the tutor's number (`ownerId`), with both visible. This applies to "Para aprovar" and "Para concluir".
- **FR-002**: The same card on the full hotel list (`/admin/hospedagens`) MUST show the name too, since it
  is one card.
- **FR-003**: When the answer has no `ownerName`, the card MUST show the number alone, as today.
- **FR-004**: The number of nights on a stay card MUST be the API's `nights` value, with "noite" for 1 and
  "noites" otherwise. The site MUST NOT calculate nights for these cards.
- **FR-005**: When the answer has no `nights`, the card MUST omit the number of nights and keep everything
  else; the page MUST still render.
- **FR-006**: Bath cards MUST keep showing the tutor as "Tutor nº" followed by the number only, as today. The
  bath appointments list has no owner name, and this feature does not add one (clarified 2026-11-15). Showing
  the name on bath cards waits for an API change like spec 033, which is not part of this feature.
- **FR-007**: The home MUST keep loading its stays from the accommodation bookings list, with the same
  requests as today. No request is added to get names or nights.
- **FR-008**: Nothing else on the home changes: order, urgency marks, counts, actions, notices, loading,
  error and empty states stay as specs 006 and 007 define them.
- **FR-009**: Automated tests MUST prove:
  - the card shows name and number together, and the number alone without a name;
  - the card shows the API's `nights` (including singular and zero), and no nights when the field is
    absent;
  - the card does not compute nights from the dates.

### Key Entities

- **Hotel stay (booking)**: as the API returns it. Adds `ownerName` (API spec 033) and `nights` (API spec
  034) to what the site reads.
- **Bath appointment**: unchanged; carries the owner's number only, so its card shows the number only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can say who owns every stay on the home without opening anything else or
  asking anyone.
- **SC-002**: For 100% of stays, the number of nights on the home equals the API's `nights` for that stay.
- **SC-003**: The home makes the same number of requests as before this feature.
- **SC-004**: An API answer without the new fields leaves the home working, with 0 errors shown.

## Clarifications

### Session 2026-11-15

- Q: Bath cards have no tutor name in their API list. Should they show it? → A: No. Bath cards keep
  "Tutor nº" only; this feature changes stay cards only (FR-006).

## Assumptions

- **"Home" means the administrator home, `/admin` ("Pendências").** `/painel` sends administrators there.
- **"Render the entire screen from the bookings list" applies to hotel stays.** Baths (spec 007) come from
  their own list. The bookings list cannot provide them, and replacing baths was not asked for. The
  inventory above lists everything that does not come from the bookings list.
- **Name first, then number**: "Ana Souza · Tutor nº 7". The number stays because names are not unique.
- **API order**: `ownerName` is in production (API spec 033). `nights` ships with API spec 034 (PR #30,
  merged; deploying). FR-005 lets the site ship before or after it without breaking.
- **The customer area is out of scope.** It still computes nights for the client's own bookings. Switching
  it to the API value is a follow-up.
- **Depends on spec 007**, which is merged into `006-admin-home` but not into `main`. This branch starts from
  spec 007's merge, so its pull request brings spec 007 to `main` unless spec 007 is shipped first.
