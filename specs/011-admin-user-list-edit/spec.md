# Feature Specification: Administrator edits users straight from the user list

**Feature Branch**: `011-admin-user-list-edit`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "When you enter on \"Usuários\" tab on adminstrator zone, call GET -> /v1/users take this response and render a list for all user. This list can change the role of user and the name of user"

## Overview

Feature 010 added a "Usuários" tab to the administrator panel, but it was built before the backend
offered a list of accounts, so it relied on a list shape (with text search) that the backend never
delivered. The backend now provides the real list of every account (API spec 036) and a single edit that
changes a name, a profile, or both at once (API spec 035).

This feature makes the "Usuários" tab show **every account as the backend lists it**, and lets the
administrator change each user's **name** and **profile** (Cliente or Administrador) **directly in that
list**, without opening a separate screen.

Nothing else about a user is edited here: e-mail, CPF, password, sign-in method, account status and pets
stay out of scope, as in 010.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See every user when opening the "Usuários" tab (Priority: P1)

An administrator opens the "Usuários" tab. The page loads the list of accounts from the backend and shows
every user — name, e-mail, profile and account status — in alphabetical order by name, a page at a time.

**Why this priority**: Nothing else in this feature works without the list, and today the tab cannot show
the real data.

**Independent Test**: As an administrator with several accounts in the system, open "Usuários" and page
through to the end; every account appears exactly once, with its name, e-mail, profile and status.

**Acceptance Scenarios**:

1. **Given** a signed-in administrator, **When** they open the "Usuários" tab, **Then** a loading state is
   shown and then the list of users, each with name, e-mail, profile (Cliente or Administrador) and
   account status.
2. **Given** more users than fit on one page, **When** the administrator moves to the next page until
   there is none, **Then** every user appears exactly once and the current page and total are shown.
3. **Given** the list, **Then** the administrator's own account appears in it, marked as "(você)".
4. **Given** an account that is pending e-mail confirmation or disabled, **Then** it is listed like any
   other, with its status visible.

---

### User Story 2 - Rename a user directly in the list (Priority: P1)

From the row of a user, the administrator changes the name and saves, without leaving the list. The row
then shows the saved name.

**Why this priority**: Correcting names is the most frequent edit, and the request asks for it in the
list itself.

**Independent Test**: In the list, rename a test user and reload the page; the row shows the new name, and
a booking of that user shows it too.

**Acceptance Scenarios**:

1. **Given** a user's row, **When** the administrator starts editing it, **Then** the name becomes editable
   in place, pre-filled with the current name, with "Salvar" and "Cancelar" actions.
2. **Given** an edited name, **When** the administrator saves, **Then** a confirmation is shown on that row
   and the row shows the name as saved (with surrounding spaces removed).
3. **Given** a name cleared (or left with only spaces), **When** the administrator saves, **Then** nothing
   is saved and an inline error on that row says the name is required.
4. **Given** an edit in progress, **When** the administrator cancels (or presses Escape), **Then** the row
   returns to the saved values and nothing is sent.

---

### User Story 3 - Change a user's profile directly in the list (Priority: P1)

From the row of a user, the administrator switches the profile between Cliente and Administrador, confirms,
and the row shows the new profile.

**Why this priority**: It is the other half of the request and the riskier change, so it keeps the
safeguards from 010.

**Independent Test**: In the list, promote a test client to Administrador; after that user's next page
load they reach the administrator panel. Demote them back from the list; they return to the client area.

**Acceptance Scenarios**:

1. **Given** a user whose profile is Cliente, **When** the administrator selects Administrador on that row
   and saves, **Then** they are asked to confirm, with text naming the user and the new profile.
2. **Given** that confirmation, **When** the administrator confirms, **Then** the change is applied, a
   confirmation is shown on the row, and the row shows Administrador; **When** they decline, **Then**
   nothing is sent and the row keeps its previous profile.
3. **Given** the administrator's own row, **Then** neither the name nor the profile can be edited there,
   with a short explanation, because the backend refuses an administrator editing their own account and
   self-demotion would lock them out of the panel.
4. **Given** both the name and the profile changed on one row, **When** the administrator saves and
   confirms, **Then** both are applied together, or, if refused, neither is, and the row says so.

---

### User Story 4 - Narrow the list by profile or status (Priority: P3)

The administrator filters the list to show only administrators or only clients, and/or only accounts of
one status (ativo, aguardando confirmação de e-mail, desativado).

**Why this priority**: Helpful once the list exists (for example, "who are the administrators?"), but the
unfiltered list already answers the request.

**Independent Test**: Filter by Administrador; only administrators appear, and paging keeps the filter.

**Acceptance Scenarios**:

1. **Given** the list, **When** the administrator filters by a profile, a status, or both, **Then** only
   matching users are shown, and moving between pages keeps the filters.
2. **Given** filters that match nothing, **Then** an explicit empty state is shown, with a way to clear
   the filters.

---

### Edge Cases

- **Not an administrator**: a signed-in client opening the tab by address is sent away like on other
  administrator pages; a signed-out visitor is sent to sign in. Neither sees any account data.
- **No users at all besides the administrator**: the list shows that one account.
- **Empty result** (filters match nothing, or a page past the last): an explicit empty state, never a
  blank area.
- **Nothing changed**: saving a row whose values were not changed sends nothing and closes the edit.
- **Several rows**: only one row is in edit mode at a time; starting to edit another row while one has
  unsaved changes asks whether to discard them.
- **User removed meanwhile**: saving shows "Usuário não encontrado" on that row and offers to reload the
  list.
- **Another administrator changed the same user meanwhile**: the last save wins; after saving, the row
  shows exactly what the backend saved.
- **Name limits**: surrounding spaces removed; more than 255 characters refused inline, before sending.
- **Administrator lost their own role meanwhile** (demoted by someone else): the next load or save is
  refused and they are sent away like any non-administrator.
- **Service failure or unreachable**: loading the list shows an error with a retry; a failed save keeps
  the typed values on the row, says the save failed, and can be retried.
- **Double submission**: while a row is saving, its save action is disabled.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Opening the "Usuários" tab MUST load the list of accounts from the backend and show it; only
  administrators may see the tab or its data.
- **FR-002**: Each row MUST show the user's name, e-mail, profile (Cliente or Administrador) and account
  status; the administrator's own row MUST be marked "(você)".
- **FR-003**: The list MUST follow the backend's order (alphabetical by name) and paging, show the current
  page and the total, and let the administrator move to the previous and next pages.
- **FR-004**: Administrators MUST be able to change a user's name directly from that user's row. The name
  is required, trimmed, and at most 255 characters.
- **FR-005**: Administrators MUST be able to change a user's profile between Cliente and Administrador
  directly from that user's row; no other profile value is offered.
- **FR-006**: A profile change MUST be explicitly confirmed before it is sent, naming the user and the
  new profile.
- **FR-007**: When both the name and the profile of a row are changed, they MUST be saved as one change:
  both applied or neither.
- **FR-008**: The administrator's own row MUST NOT be editable.
- **FR-009**: After each save the row MUST show the values the backend saved and a success message; on
  failure it MUST say what failed, keep the typed values, and allow retrying.
- **FR-010**: Cancelling an edit MUST restore the row's saved values without sending anything.
- **FR-011**: Administrators SHOULD be able to filter the list by profile and by account status; filters
  MUST be kept when moving between pages.
- **FR-012**: The tab MUST show a loading state while the list loads and while a row saves, an error state
  with retry when loading fails, and an explicit empty state when there are no results.
- **FR-013**: No other user data (e-mail, CPF, password, sign-in method, status, pets) MUST be editable.
- **FR-014**: The whole tab, including editing and confirming, MUST work in desktop and mobile browsers
  and MUST be operable with the keyboard alone.
- **FR-015**: Access rules MUST be the same whether the administrator signed in with Google or with
  e-mail and password.

### Key Entities

- **User (account)**: name (editable), e-mail (read-only), profile — Cliente or Administrador
  (editable), account status (read-only: ativo, aguardando confirmação de e-mail, desativado).
- **Page of users**: one slice of the ordered list, with its page number, total users and total pages.
- **Profile change record**: kept by the backend for each profile change (who, whose, from, to, when);
  this feature only creates new records through normal use.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can go from opening "Usuários" to a saved name correction, without leaving
  the list, in under 30 seconds.
- **SC-002**: Paging through the whole list shows every account exactly once (0 repeated, 0 missing).
- **SC-003**: 100% of attempts by clients or signed-out visitors to open the tab or change a user are
  refused, and none of them sees any account data.
- **SC-004**: Zero self-edits are possible from the list: an administrator can never demote or rename
  themselves there.
- **SC-005**: After a save, the row shows exactly the saved values in 100% of cases, and a renamed user's
  new name appears on every administrator screen showing that user the next time it is opened.
- **SC-006**: Every flow in the tab (list, page, edit, confirm, cancel, filter) can be completed using
  only the keyboard, on both phone-sized and desktop-sized screens.

## Assumptions

- **Builds on 010.** This feature replaces the list of the existing "Usuários" tab; navigation, the
  link from the administrator home, access rules and labels from 010 stay.
- **Backend is ready.** The backend already lists accounts for administrators (API spec 036) and edits a
  name and/or profile in one atomic change (API spec 035), refusing an administrator's edit of their own
  account. The web uses those and nothing else (Constitution Principle II).
- **No text search.** The backend list has no search by name or e-mail (deliberately, to keep e-mails out
  of logs), so the text search from 010 is removed. Filters by profile and status take its place.
- **Editing happens in the list.** The separate per-user edit screen from 010 is no longer the way to
  edit; its address keeps working by sending the administrator to the list, so old links do not break.
- **Page size**: the backend default (20 users per page).
- **Effect of a profile change**: takes effect on the affected user's next page load (roles are checked
  on every request); forcing an immediate sign-out is out of scope.
- **No creation or deletion** of accounts in this area.
- **Language**: the interface is in Brazilian Portuguese, like the rest of the site.
