# Feature Specification: Registration screen for new users

**Feature Branch**: `009-user-registration`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Build a registration screen for new users. Use the attached JSON example as the request schema, preserving the API's field names and types. Add Password and Confirm password fields. Before submission, check that they match. If they differ, show an inline error under Confirm password. Keep the confirmation value in the form only. Submit the form as JSON using POST https://api.entrepataseturnos.com/v1/users with Content-Type: application/json. Disable the submit button while the request is pending. On success, show Account created and provide a link to sign in. On failure, show a clear error and let the user retry without re-entering their non-password details."

## Overview

Today a person can only get into the site with Google. entrePatasETurnosAPI already accepts password
registrations (`POST /v1/users`), but the site has no screen for it. This feature adds a public
registration screen that collects the details the API asks for, checks that the password was typed the
same way twice, sends the registration, and tells the person clearly whether their account was created.

### Request schema

No JSON example was attached to the request, so the schema below is taken from the API itself
(`RegistrationRequest` in entrePatasETurnosAPI). Field names and types are kept exactly as the API
defines them:

```json
{
  "email": "voce@email.com",
  "name": "Maria da Silva",
  "cpf": "123.456.789-09",
  "password": "uma-senha-longa"
}
```

| Field | Type | On screen | API rule (for reference) |
|---|---|---|---|
| `email` | string | E-mail | Required; must look like an address |
| `name` | string | Nome completo | Required |
| `cpf` | string | CPF | Required; must be a valid CPF |
| `password` | string | Senha | At least 8 characters; sent exactly as typed |
| *(none)* | — | Confirmar senha | Screen only; never sent |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account with a password (Priority: P1)

A new visitor opens the registration screen, fills in e-mail, full name, CPF, password and password
confirmation, and submits. The account is created and the screen says "Account created", with a link to
the sign-in screen.

**Why this priority**: This is the whole purpose of the feature; without it nobody can register from the
site.

**Independent Test**: Fill the form with valid, unused details and submit; the success message and the
sign-in link appear, and the API holds a new pending account for that e-mail.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor on the registration screen, **When** they fill every field with valid
   details, type the same password twice and submit, **Then** the registration is sent with exactly the
   fields `email`, `name`, `cpf` and `password`, and the screen shows "Account created" with a link to sign
   in.
2. **Given** the registration has been sent and no answer has arrived yet, **When** the visitor looks at
   or tries to use the submit button, **Then** it is disabled and indicates that the request is in
   progress, so the form cannot be sent twice.
3. **Given** the account was created, **When** the visitor follows the sign-in link, **Then** they reach
   the site's sign-in screen.

---

### User Story 2 - Catch a mistyped password before sending (Priority: P1)

The visitor types a password and a different confirmation. The screen stops them before anything is sent
and says, right under the confirmation field, that the passwords do not match.

**Why this priority**: The request explicitly requires this check; an account created with a mistyped
password is unusable.

**Independent Test**: Enter two different passwords and submit; no registration is sent and the inline
error appears under "Confirmar senha".

**Acceptance Scenarios**:

1. **Given** the password and confirmation differ, **When** the visitor submits, **Then** nothing is sent
   and an error saying the passwords do not match appears directly under the confirmation field.
2. **Given** that error is showing, **When** the visitor corrects the confirmation so both match and
   submits again, **Then** the error disappears and the registration is sent.
3. **Given** any submission, **When** the registration is sent, **Then** it does not contain the
   confirmation value under any name.

---

### User Story 3 - Recover from a failed registration (Priority: P2)

The registration is refused (for example, the e-mail or CPF is already registered, a field is invalid, or
the service is unreachable). The screen explains what went wrong and keeps everything the visitor typed
except the passwords, so they can fix the problem and try again.

**Why this priority**: Failures are common at registration (duplicates, typos), and making people retype
everything is the main reason they give up.

**Independent Test**: Submit with an e-mail that is already registered; a clear error appears, e-mail,
name and CPF are still filled in, and a corrected submission succeeds.

**Acceptance Scenarios**:

1. **Given** the API rejects a field (invalid e-mail, invalid CPF, short password, missing name), **When**
   the answer arrives, **Then** the API's message for that field is shown next to that field, and e-mail,
   name and CPF keep the values the visitor typed.
2. **Given** the e-mail is already registered, **When** the answer arrives, **Then** the screen says the
   user is already registered (with the message the API provides), and suggests signing in instead.
3. **Given** the CPF is already registered, **When** the answer arrives, **Then** the screen says the CPF
   is already registered.
4. **Given** the service is unreachable or answers with an unexpected error, **When** the request ends,
   **Then** the screen shows a general message that the account could not be created and asks the visitor
   to try again, with no technical detail.
5. **Given** any failure, **When** the error is shown, **Then** the submit button is enabled again and the
   visitor can resubmit after re-entering only the password and its confirmation.

---

### Edge Cases

- **Double submission**: pressing Enter or clicking repeatedly while a request is pending sends only one
  registration.
- **Empty fields**: submitting with a required field empty is caught on the screen before sending, with a
  message under that field.
- **Password shorter than 8 characters**: caught on the screen before sending, with the same rule the API
  applies; the API's answer remains the final word.
- **Spaces in the password**: the password is sent exactly as typed, never trimmed; the match check
  compares the two values exactly.
- **CPF typed with or without dots and dash**: both are accepted as typed; the API normalises it.
- **Visitor already signed in**: opening the registration screen sends them to their own area instead.
- **Leaving after success**: the success state does not keep the password anywhere on the screen.
- **Slow connection**: the in-progress state stays visible for as long as the request takes; if it fails
  by timing out, the general retry message is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST provide a public registration screen, reachable by signed-out visitors, with
  fields for e-mail, full name, CPF, password and password confirmation.
- **FR-002**: The registration MUST be sent to entrePatasETurnosAPI's user registration operation
  (`POST https://api.entrepataseturnos.com/v1/users`) as a JSON body (`Content-Type: application/json`)
  with exactly the fields `email`, `name`, `cpf` and `password`, all strings, named as in the API.
- **FR-003**: The password confirmation MUST exist only in the form. It MUST NOT be sent, stored, or
  logged anywhere.
- **FR-004**: Before sending, the screen MUST check that password and confirmation are identical. If they
  differ, nothing is sent and an inline error MUST appear directly under the confirmation field.
- **FR-005**: Before sending, the screen MUST check that every field is filled and the password has at
  least 8 characters, showing a message under each field that fails.
- **FR-006**: While the registration is pending, the submit button MUST be disabled and show that the
  request is in progress; only one request may be in flight at a time.
- **FR-007**: When the account is created, the screen MUST show "Account created" and a link to the
  sign-in screen. It MUST also tell the person to confirm their e-mail address, because the API creates
  the account pending e-mail verification.
- **FR-008**: When the API rejects specific fields, the screen MUST show each field's message next to
  that field.
- **FR-009**: When the API reports that the e-mail or the CPF is already registered, the screen MUST say
  so clearly and offer the sign-in link.
- **FR-010**: Any other failure (service unreachable, timeout, unexpected answer) MUST produce a general,
  non-technical message asking the visitor to try again.
- **FR-011**: After any failure, the e-mail, name and CPF MUST keep what the visitor typed; the password
  and confirmation MUST be cleared; the submit button MUST be enabled again.
- **FR-012**: The whole flow MUST work on phones and computers, and MUST be completable using only a
  keyboard; errors MUST be announced to assistive technology and tied to their field.
- **FR-013**: The sign-in screen MUST offer a link to the registration screen, so visitors can find it.

### Key Entities

- **Registration**: what the visitor submits: e-mail, full name, CPF, password. Sent once per attempt;
  the site keeps none of it after the attempt ends.
- **Registered account** (API answer): the new account's id, e-mail, name, status (pending e-mail
  verification) and role. The site uses it only to confirm success.
- **Registration error** (API answer): either per-field messages (`fields`) or a single error code and
  message (for example, user already registered, CPF already registered).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor can complete the registration form and see "Account created" in under 2
  minutes.
- **SC-002**: 100% of submissions with mismatched passwords are stopped before anything is sent, with the
  error shown under the confirmation field.
- **SC-003**: In 100% of sent registrations, the request contains only `email`, `name`, `cpf` and
  `password`; the confirmation never leaves the form.
- **SC-004**: Repeated clicks or key presses during a pending request result in exactly one registration
  attempt.
- **SC-005**: After any failed attempt, a visitor can retry by typing only the password and confirmation
  again; e-mail, name and CPF are preserved in 100% of failure cases.
- **SC-006**: Every failure case listed in User Story 3 shows a message a non-technical person can act on
  (what went wrong and what to do next).

## Assumptions

- **Schema source**: the request mentioned an attached JSON example, but none arrived. The schema comes
  from the API's `RegistrationRequest` (`email`, `name`, `cpf`, `password`, all strings). If the intended
  example differs, this spec needs updating before planning.
- **Who calls the API**: the site's architecture keeps every API call on the site's server (the browser
  never talks to the API directly). The registration follows the same pattern: the site's server sends
  the `POST /v1/users` JSON request described in FR-002. What the API receives is identical either way.
- **Sign-in link**: it points to the existing sign-in screen (`/entrar`). That screen offers Google only
  today, and the API does not yet support password sign-in; a new account also cannot sign in until its
  e-mail is confirmed. The success message therefore tells the person to confirm their e-mail first.
  Password sign-in is a separate feature.
- **Language**: the screen's text is in Portuguese, like the rest of the site; "Account created" is shown
  as its Portuguese equivalent ("Conta criada"). API error messages are already in Portuguese and are shown
  as given.
- **Field messages**: client-side checks mirror the API's rules (required fields, password of at least
  8 characters) only to give earlier feedback; the API's answer is authoritative. CPF validity is left to
  the API.
- **Out of scope**: e-mail confirmation screen, resending the confirmation e-mail, password sign-in,
  password strength meter, CAPTCHA, and linking a password account to a Google account.
