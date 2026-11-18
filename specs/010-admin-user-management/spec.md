# Feature Specification: Administrator user management

**Feature Branch**: `010-admin-user-management`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Generate a manage user area, there I just need to change the name of user and profile(CLIENT or ADMINISTRATOR). Put this link on admin home"

## Overview

Today an administrator has no way, from the site, to correct a person's name or to make someone an
administrator (or take that away). This feature adds a "Usuários" area to the administrator panel. In
it, an administrator finds a user, then changes two things only: the user's **name** and the user's
**profile**, which is either **Cliente** (CLIENT) or **Administrador** (ADMINISTRATOR). The area is
reached from the administrator home.

Nothing else about a user is edited here: e-mail, CPF, password, sign-in method, account status and
pets are out of scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find a user and change their name (Priority: P1)

An administrator opens the administrator home, follows the "Usuários" link, finds the person (by name
or e-mail), opens them, corrects the name, and saves. The list and every screen that shows the owner's
name (for example, booking cards) show the new name from then on.

**Why this priority**: Names arrive misspelled or incomplete (Google accounts often carry nicknames),
and the owner's name is what administrators read on every booking. It is the most frequent correction.

**Independent Test**: As an administrator, rename a test user and reload; the user list and a booking of
that user show the new name.

**Acceptance Scenarios**:

1. **Given** a signed-in administrator on the administrator home, **When** they activate the "Usuários"
   link, **Then** they reach the user list, which shows each user's name, e-mail and current profile.
2. **Given** the user list, **When** the administrator types part of a name or e-mail in the search,
   **Then** only matching users are listed.
3. **Given** a user's edit screen, **When** the administrator changes the name and saves, **Then** a
   confirmation is shown, and the list shows the new name.
4. **Given** a user's edit screen, **When** the administrator clears the name (or leaves only spaces)
   and saves, **Then** nothing is saved and an inline error says the name is required.

---

### User Story 2 - Change a user's profile between Cliente and Administrador (Priority: P1)

An administrator opens a user and switches their profile from Cliente to Administrador (or back), then
saves. The change applies to what that user can access.

**Why this priority**: Without it, the only way to add a second administrator is outside the site. It
is as essential as renaming, and it is the riskier of the two, so it carries extra safeguards.

**Independent Test**: Promote a test client to Administrador; after that user signs in again (or their
session renews) they land on the administrator panel. Demote them back; they land on the client area.

**Acceptance Scenarios**:

1. **Given** a user whose profile is Cliente, **When** the administrator selects Administrador and saves,
   **Then** a confirmation is shown and the list shows the profile as Administrador.
2. **Given** a user whose profile is Administrador, **When** the administrator selects Cliente and saves,
   **Then** the list shows the profile as Cliente.
3. **Given** the administrator is viewing **their own** account, **Then** the profile cannot be changed
   there (the choice is shown as read-only with a short explanation), so an administrator cannot lock
   themselves out of the panel by mistake.
4. **Given** the administrator changes the profile, **When** they save, **Then** they are asked to
   confirm before the change is applied, with text naming the user and the new profile.

---

### User Story 3 - Reach the area from the administrator home (Priority: P2)

The administrator home shows a clear entry point to user management, and the administrator section
navigation includes it, so the area is discoverable without knowing its address.

**Why this priority**: The area is usable by address alone, but the request explicitly asks for the
link on the administrator home.

**Independent Test**: Sign in as an administrator, open the home, and reach the user list using only the
keyboard.

**Acceptance Scenarios**:

1. **Given** the administrator home, **Then** a "Usuários" link is visible in the section navigation
   next to "Pendências" and "Hospedagens", and leads to the user list.
2. **Given** the user list or an edit screen, **Then** the section navigation marks "Usuários" as the
   current section.

---

### Edge Cases

- **Not an administrator**: a signed-in client who opens the area by address is sent away the same way
  as from other administrator pages; a signed-out visitor is sent to sign in.
- **Nothing changed**: saving without changing either field does not send anything and says there is
  nothing to save.
- **Both fields changed**: name and profile are saved together; if one change is accepted and the other
  refused, the screen says exactly which one was saved and which was not.
- **User no longer exists** (removed between listing and saving): a clear "user not found" message with
  a way back to the list.
- **Another administrator changed the same user meanwhile**: the last save wins; the screen always
  shows what was saved after the answer arrives.
- **Name limits**: surrounding spaces are removed; a name longer than the allowed maximum (255
  characters) is refused with an inline error.
- **Empty search**: an explicit empty state ("Nenhum usuário encontrado") rather than a blank list.
- **Many users**: the list is paginated; search still covers all users, not just the page shown.
- **Service failure or unreachable**: a clear error, the typed values kept, and the save can be retried.
- **Pending e-mail confirmation or disabled accounts**: they are listed and editable like any other user,
  with their status shown so the administrator knows why that user cannot sign in.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a user management area available only to administrators;
  clients and signed-out visitors MUST NOT see it or its data.
- **FR-002**: The administrator home MUST offer a link to the user management area, and the
  administrator section navigation MUST include it as "Usuários".
- **FR-003**: The area MUST list users showing, for each, name, e-mail, profile (Cliente or
  Administrador) and account status.
- **FR-004**: Administrators MUST be able to search the list by part of the name or e-mail, across all
  users.
- **FR-005**: The list MUST be paginated and MUST show an explicit empty state when nothing matches.
- **FR-006**: Administrators MUST be able to change a user's name. The name is required, is trimmed, and
  is at most 255 characters.
- **FR-007**: Administrators MUST be able to change a user's profile between Cliente (CLIENT) and
  Administrador (ADMINISTRATOR); no other profile value is offered.
- **FR-008**: A profile change MUST be confirmed explicitly by the administrator before it is applied.
- **FR-009**: An administrator MUST NOT be able to change their own profile from this area.
- **FR-010**: No other user data (e-mail, CPF, password, sign-in method, status, pets) MUST be editable
  in this area.
- **FR-011**: After each save the administrator MUST see a success or failure message that says what
  was saved; on failure the entered values MUST be kept so the save can be retried.
- **FR-012**: Every screen in the area MUST show a loading state while data is being fetched or saved,
  and the save action MUST NOT be submittable twice while a save is in progress.
- **FR-013**: The whole area MUST work in desktop and mobile browsers and MUST be operable with the
  keyboard alone.
- **FR-014**: Access rules MUST be the same whether the administrator signed in with Google or with
  e-mail and password.
- **FR-015**: Every profile change MUST be recorded with who made it and when (the existing role-change
  audit trail), so changes can be traced.

### Key Entities

- **User**: a person with an account. Attributes relevant here: name (editable), e-mail (read-only),
  profile — Cliente or Administrador (editable), account status (read-only: active, pending e-mail
  confirmation, disabled).
- **Profile change record**: who changed whose profile, from what to what, and when. Already kept by the
  backend; this feature only creates new records through normal use.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can go from the administrator home to a saved name correction in under
  1 minute.
- **SC-002**: An administrator can find any user by part of their name or e-mail in under 10 seconds,
  with any number of users.
- **SC-003**: 100% of attempts by clients or signed-out visitors to open or use the area are refused.
- **SC-004**: An administrator can never lose administrator access through their own action in this
  area (zero self-demotions possible).
- **SC-005**: A renamed user's new name appears on every administrator screen that shows that user,
  the next time that screen is opened.
- **SC-006**: Every flow in the area can be completed using only the keyboard, on both a phone-sized
  and a desktop-sized screen.

## Assumptions

- **Backend dependency**: entrePatasETurnosAPI already changes a user's profile (role), restricted to
  administrators and audited. It does **not** yet offer (a) a list/search of users for administrators,
  or (b) a way for an administrator to change another user's name. Both are needed from the API before
  this feature can be completed; per the web constitution (Principle II), the site will not work around
  them.
- **Profile names**: on screen "Cliente" and "Administrador", matching the API's CLIENT and
  ADMINISTRATOR. No other roles exist or are planned here.
- **Effect of a profile change on an active session**: the new profile takes effect on the affected
  user's next page load, because the role is checked with the backend on every request (see
  research R3); forcing an immediate sign-out is out of scope.
- **Self-protection**: blocking self-demotion is the chosen default to prevent lockout. Ensuring at
  least one administrator always exists is otherwise left to the backend.
- **Search**: case-insensitive, by part of name or e-mail. Filtering by profile or status is not
  required for this version.
- **No creation or deletion**: users are created by Google sign-in or registration; this area neither
  creates nor deletes accounts.
- **Language**: the interface is in Brazilian Portuguese, like the rest of the site.
