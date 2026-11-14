# Feature Specification: Administrator home with every pending request

**Feature Branch**: `006-admin-home`
**Created**: 2026-11-14
**Status**: Draft
**Input**: User description: "When my admin client gets in on home, the admin has to see all pendencies,
like: all bookings looking for approval, all baths looking for approval. Make the administrator screen for
my admin users."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See and act on everything waiting for approval (Priority: P1)

An administrator signs in and lands on a home screen that lists every request waiting for their decision,
across services, with the most urgent first (the soonest check-in). They can approve or deny each one
from that screen without hunting through filters.

**Why this priority**: Requests that wait too long block the tutor's plans and can be lost to
capacity. One place that answers "what needs me now?" is the whole point of the feature.

**Independent Test**: Sign in as an administrator with three pending hotel bookings whose check-ins are
on different days. The home shows all three, earliest check-in first, each with Approve and Deny. Approve
one: it leaves the list and the counts drop by one.

**Acceptance Scenarios**:

1. **Given** pending hotel bookings exist, **When** an administrator opens the home, **Then** every one
   is listed, ordered by check-in (earliest first), each showing the service, the pets, the stay's dates
   and nights, and when it was requested.
2. **Given** a pending booking whose check-in is within the next 48 hours, **When** it is listed,
   **Then** it is marked as urgent.
3. **Given** a listed booking, **When** the administrator approves it, **Then** it leaves the list, the
   counts update and a confirmation appears; **When** they deny it, **Then** they must give a reason
   first, which the tutor will see.
4. **Given** the API refuses an approval (for example, no capacity left), **When** the administrator
   approves, **Then** the booking stays listed and the reason is shown next to it.
5. **Given** nothing is pending, **When** the home opens, **Then** an explicit "all caught up" state is
   shown instead of an empty list.

---

### User Story 2 - See stays that need to be closed (Priority: P2)

Approved stays whose check-out has already passed still need the administrator to mark them completed.
The home lists them in a second group, each with a "Mark as completed" action.

**Why this priority**: It is the other daily obligation of an administrator, but it is not
time-critical the way approvals are.

**Independent Test**: With one approved stay that ended yesterday and one approved stay that ends next
week, the home's "to complete" group shows only the first.

**Acceptance Scenarios**:

1. **Given** an approved booking the API allows completing, **When** the home opens, **Then** it appears
   under "to complete" with a "Mark as completed" action.
2. **Given** an approved booking still in progress or in the future, **Then** it does not appear there.

---

### User Story 3 - Know that baths and training will show up here (Priority: P3)

The home shows a summary per service: hotel approvals, hotel stays to complete, baths and training.
Baths and training are marked "coming soon", because the API does not support them yet, and they show
how they will appear once it does.

**Why this priority**: It sets the right expectation without inventing data. It becomes real when the
API's bath appointment feature (API spec 032) ships.

**Independent Test**: The home shows a bath summary saying "em breve" and no fake numbers.

**Acceptance Scenarios**:

1. **Given** the API has no bath or training endpoints, **When** the home opens, **Then** those services
   appear as "em breve", with no counts and no actions.

---

### User Story 4 - Browse every hotel booking (Priority: P3)

The full hotel list with the status filters (pending, approved, denied, completed) and pagination
remains available on its own page, reachable from the home.

**Acceptance Scenarios**:

1. **Given** the administrator is on the home, **When** they follow "Hospedagens", **Then** they reach the
   full list with filters, and can return to the home.

### Edge Cases

- More than 100 pending bookings: the home shows the 100 most urgent and says how many exist in total,
  linking to the full list.
- The API is unreachable or answers an error: the home shows an error state with a retry, never a blank
  or partial screen that looks like "nothing pending".
- While data loads, a loading state is shown.
- A tutor (non-administrator) opening the home is sent to their own area; a signed-out visitor is sent
  to the login page.
- An administrator's own booking is listed without Approve/Deny (the API forbids self-review and omits
  those actions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After sign-in, administrators MUST land on the home (`/admin`), which lists pending hotel
  bookings ordered by check-in, earliest first.
- **FR-002**: Each pending item MUST show the service, the pets, check-in and check-out, the number of
  nights, the request date, and an urgency mark when the check-in is less than 48 hours away.
- **FR-003**: The home MUST offer Approve and Deny (with a required reason of at most 1000 characters) on
  each item, and only when the API advertises that action for that booking.
- **FR-004**: The home MUST list approved bookings the API allows completing, with a "Mark as completed"
  action.
- **FR-005**: The home MUST show a summary with counts for hotel approvals and hotel stays to complete,
  and "em breve" entries for baths and training.
- **FR-006**: The full hotel booking list with status filters and pagination MUST remain available at
  `/admin/hospedagens`, linked from the home.
- **FR-007**: The home MUST handle loading, failure (with retry) and empty states explicitly.
- **FR-008**: Every action MUST be re-authorized on the server; the decision of what is allowed stays
  with the API.
- **FR-009**: Every element of the home MUST be operable by keyboard and the layout MUST work on phone
  widths without horizontal scrolling.

### Key Entities

- **Pending item**: a request waiting for an administrator: service, pets, dates, request date, urgency,
  and the actions the API allows.
- **Service summary**: per service, the number of items waiting, or "em breve".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can see every pending hotel booking within one screen load after sign-in,
  with no filter to choose.
- **SC-002**: Approving or denying from the home takes at most two interactions (deny: open, confirm with
  reason).
- **SC-003**: The home is fully usable at 390 px wide and by keyboard alone.

## Assumptions

- Hotel bookings come from API spec 030 (`/v1/accommodation-bookings`); size is capped at 100 per request.
- Baths and training have no API yet. Bath appointments are specified separately in the API (spec 032);
  this screen gains a real bath list when that ships.
- Urgency threshold: 48 hours before check-in, in Brasília time.
- "To complete" uses the API's `complete` link, so the rule for when a stay can be completed stays in
  the API.
