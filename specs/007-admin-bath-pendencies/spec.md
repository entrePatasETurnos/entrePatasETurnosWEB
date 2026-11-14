# Feature Specification: Pending baths on the administrator home

**Feature Branch**: `007-admin-bath-pendencies`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Follow-up to spec 006: the administrator home must list baths waiting for approval next to hotel
bookings, now that entrePatasETurnosAPI spec 032 (bath appointments, API PR #25) provides them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Approve baths and stays from one list (Priority: P1)

An administrator opens the home and sees every request waiting for a decision, hotel stays and baths
together, soonest first. Each item says which service it is. Approve and deny work the same for both.

**Independent Test**: With one pending bath tomorrow 09:30 and one pending stay next week, the home lists the
bath first, marked urgent and labelled "Banho", then the stay; approving the bath removes it and updates
the bath count.

**Acceptance Scenarios**:

1. **Given** pending baths and stays, **When** the home opens, **Then** both are listed in one list ordered
   by start (a bath's start, a stay's check-in), each labelled with its service, with urgency marks as in
   spec 006.
2. **Given** a pending bath, **When** the administrator approves it, **Then** it leaves the list and the
   summary updates; **When** they deny it, **Then** a reason is required, as for stays.
3. **Given** the bath's hour is already taken, **When** the administrator approves it, **Then** it stays
   listed with "this hour is already taken" next to it.
4. **Given** several approvable items of both services, **When** the administrator uses "Aprovar todas",
   **Then** each is approved by its own service, and the outcome counts both.

---

### User Story 2 - Close baths that happened (Priority: P2)

Approved baths that have ended appear under "Para concluir" with stays, each with "Marcar como
concluído".

---

### User Story 3 - Keep working while the API has no baths (Priority: P1)

The site may be deployed before the API that knows about baths. Then the bath summary keeps showing
"Em breve" and nothing else changes.

**Acceptance Scenarios**:

1. **Given** an API that answers "not found" for the bath list, **When** the home opens, **Then** it shows
   hotel pendencies exactly as in spec 006 and baths as "Em breve", with no error.

### Edge Cases

- A bath whose pet was removed shows "Pet removido".
- The administrator's own pet's bath is listed without actions, with the same note as an own stay.
- The bath list fails with any other error: the home's error state, as for stays (never a partial page that
  looks like "nothing pending").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home MUST list pending baths and stays in one list ordered by start, earliest first,
  each labelled with its service.
- **FR-002**: Bath items MUST show the pet, the day and the hour (start → end), the service, the request
  date, urgency, and the actions the API advertises.
- **FR-003**: Approve, deny (reason 1-1000 characters) and complete MUST call the bath endpoints for baths
  and the booking endpoints for stays; refusals MUST be shown in Portuguese next to the item.
- **FR-004**: The summary MUST count baths to approve; "to complete" MUST count stays and baths.
- **FR-005**: When the API has no bath endpoints (a `404` on the bath list), baths MUST show as "Em breve"
  and nothing else may change.
- **FR-006**: "Aprovar todas" MUST approve both kinds, each through its own endpoint.

## Success Criteria *(mandatory)*

- **SC-001**: An administrator sees every pending bath and stay in one screen, with no filter to choose.
- **SC-002**: The site can be deployed before the bath API without any visible error.

## Assumptions

- Bath appointments follow API spec 032's contract (`/v1/bath-appointments`, links `approve`, `deny`,
  `complete`).
- A browsable list of all baths (like `/admin/hospedagens`) is out of scope here.
