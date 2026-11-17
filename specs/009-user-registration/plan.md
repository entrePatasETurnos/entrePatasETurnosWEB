# Implementation Plan: Registration screen for new users

**Branch**: `009-user-registration` (to be created from `main` after spec 008 merges) | **Date**: 2026-11-16 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-user-registration/spec.md`

## Summary

This adds a public `/cadastro` page with a registration form: e-mail, full name, CPF, password, and
password confirmation. The form is a Client Component using `useActionState`. Its Server Action,
`registerAction`, sends `POST /v1/users` with the JSON body `{ email, name, cpf, password }` through the
existing `apiFetch`, which sets `Content-Type: application/json`.

- **Confirmation**: the input has no `name`, so it never leaves the browser. The form compares it with
  the password before submitting and shows "As senhas não conferem." under it on a mismatch.
- **Pending**: the button is disabled while the action is pending (and until the form has hydrated).
- **Success**: the form is replaced by "Conta criada", a note to confirm the e-mail, and a link to
  `/entrar`.
- **Failure**: API field messages appear under their fields. Duplicate e-mail or CPF gets a message and a
  sign-in link. Anything else gets a general retry message.
- **Retry**: the action returns the submitted e-mail, name and CPF as `defaultValue`s, so they survive
  React's post-action form reset while both password fields are cleared.

## Technical Context

**Language/Version**: TypeScript 5, Node.js ≥ 22

**Primary Dependencies**: Next.js 16.4.5 (App Router, Server Actions), React 19.3.0 (`useActionState`).
Nothing is added.

**Storage**: none. The account lives in the API (constitution II).

**Testing**:
- Vitest, Node environment (`tests/unit/*.test.ts`), with `fetch` stubbed as in the existing tests.
- No DOM test environment. Form decisions are pure helpers (research R8).
- Browser checks in [quickstart.md](./quickstart.md).

**Target Platform**: the existing standalone Next.js server (Docker) behind NGINX. `API_BASE_URL` is
`https://api.entrepataseturnos.com` in production.

**Project Type**: web application, a backend-for-frontend.

**Performance Goals**: one API request per valid submission and none for an invalid one. The page is
static apart from the form.

**Constraints**:
- The confirmation value never leaves the browser (FR-003, research R2).
- The password is never trimmed, logged, or returned in the action's state.
- The browser never calls the API directly. The Server Action does (README, research R1).
- API messages are shown as given. The site does not copy the e-mail regex or the CPF algorithm
  (research R6).

**Scale/Scope**: 1 new route (`/cadastro`, 4 files), 2 new lib files, 3 edited files, and 1 new test file
plus one extended test file.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | How compliance is verified |
|---|---|---|
| I. Next.js/React, responsive, keyboard | Yes | Built as an App Router page with a React Client Component. Quickstart scenario 12: the full flow with the keyboard only, at 390 px and 1280 px, with no horizontal scroll. The UI contract fixes the tab order, `aria-invalid`/`aria-describedby` on fields, `role="alert"` on the form message, and focus on the first invalid field and on the success heading. |
| II. API as backend | Yes | Registration goes through `apiFetch` to `POST /v1/users`, with no local rules beyond required fields and length (research R6). States: **loading**, a disabled button reading "Criando conta…" (quickstart 2, 10); **failure**, each API answer mapped (unit tests for every row of `contracts/api-registration.md`; quickstart 5–9); **empty results**, not applicable (no list). |
| III. Two sign-in methods, one set of rules | Partly | This feature creates password accounts; it adds no sign-in and no protected feature. `/cadastro` is public by design. A signed-in visitor is redirected to `/painel`, covered by a new case in `tests/unit/proxy.test.ts`. Password **sign-in** is still missing (the API doesn't offer it yet), so the requirement for checks covering both methods remains open. That gap is pre-existing, outside this feature's scope, and recorded in the README. |
| IV. Plans document verification | Yes | This table. |

**Result**: PASS. Post-design re-check: PASS. The design adds no dependency and no protected route. The
only API call is the documented public endpoint, and the confirmation stays in the browser.

## Project Structure

### Documentation (this feature)

```text
specs/009-user-registration/
├── spec.md
├── plan.md                         # this file
├── research.md                     # R1–R8
├── data-model.md                   # request, form state, API answers
├── quickstart.md                   # automated and browser validation
├── contracts/
│   ├── api-registration.md         # POST /v1/users: request, answers, site behaviour
│   └── ui-registration.md          # /cadastro fields, messages, success panel
├── checklists/requirements.md
└── tasks.md                        # /speckit-tasks
```

### Source Code (repository root)

```text
src/lib/registration.ts             new, client-safe: RegistrationState types, validateRegistration(),
                                    confirmationError(), PASSWORD_MIN_LENGTH = 8
src/lib/users.ts                    new, server-only: registerUser(request) → apiFetch POST /v1/users
src/app/cadastro/page.tsx           new: layout like /entrar, metadata "Criar conta", renders the form
src/app/cadastro/actions.ts         new, "use server": registerAction(prev, formData) → RegistrationState;
                                    maps ApiError per research R5; never returns or logs the password
src/app/cadastro/RegistrationForm.tsx  new, "use client": useActionState, confirmation check in onSubmit,
                                    defaultValues from state, disabled while pending or before hydration,
                                    success panel
src/app/cadastro/cadastro.module.css   new: field and error styles (layout classes reused from entrar)
src/app/entrar/page.tsx             edit: link to /cadastro (FR-013)
src/proxy.ts                        edit: matcher + "/cadastro"; redirect to /painel when signed in
README.md                           edit: route table row for /cadastro; "Not built yet" note updated
tests/unit/registration.test.ts     new: validateRegistration, confirmationError, registerAction with fetch
                                    stubbed (URL, method, Content-Type, exact body keys, every answer)
tests/unit/proxy.test.ts            edit: /cadastro with a session cookie → /painel; without → page
```

**Structure Decision**: the existing single Next.js app. The new route follows the `/entrar` pattern
(page plus a client component) and the `/admin` pattern (`actions.ts` with `useActionState`). API access
stays in `src/lib/*`, the only code that calls the API.

## Complexity Tracking

None. There are no constitution violations.
