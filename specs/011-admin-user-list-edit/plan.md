# Implementation Plan: Administrator edits users straight from the user list

**Branch**: `011-admin-user-list-edit` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-admin-user-list-edit/spec.md`

## Summary

Rework 010's "Usuários" tab around the API that now exists. The list at `/admin/usuarios` loads
`GET /v1/users` (API 036) with profile/status filters and paging, and each row can be edited in
place: name and profile, saved through one Server Action that sends a single atomic
`PATCH /v1/users/{id}` (API 035) with only the changed fields, then calls `refresh()`. Profile changes keep
010's in-page confirmation; the administrator's own row is read-only. The separate edit screen becomes a
redirect to the list. The 010 text search and the "em breve" fallback are removed.

## Technical Context

**Language/Version**: TypeScript 5, Node ≥ 22

**Primary Dependencies**: Next.js 16.4.5 (App Router, Server Components, Server Actions, `refresh` from
`next/cache`), React 19.3 (`useActionState`); no new dependencies

**Storage**: N/A (all data in entrePatasETurnosAPI)

**Testing**: Vitest 5 unit tests in `tests/unit/` with `fetch` stubbed; `npm run lint`, `npm run typecheck`

**Target Platform**: Node standalone server (Kubernetes behind NGINX); desktop and mobile browsers

**Project Type**: Web application (backend-for-frontend over entrePatasETurnosAPI)

**Performance Goals**: List renders with two API calls in parallel (list + `/me`) plus the role check; a
row save is one API call; rename end-to-end under 30 s for an administrator (SC-001)

**Constraints**: API access server-only (tokens never reach the browser); keyboard-only operable; no
horizontal scroll at 320 px; Portuguese copy; no `window.confirm`

**Scale/Scope**: Hundreds to low thousands of accounts, 20 per page; 1 page reworked, 1 page turned into a
redirect, 2 new client components, 1 action rewritten, 1 data module updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | How compliance is verified |
|---|---|---|
| I. Next.js and React, responsive and keyboard-usable | Yes | Server Component page + Client Components `UserList`/`UserRow`. Quickstart 11 (375 px, keyboard only). Edit mode, confirmation and discard panels are in-page, focus moves into them and back, `Esc` cancels; only native inputs, buttons, selects and links. |
| II. entrePatasETurnosAPI as the backend | Yes | All reads/writes via `src/lib/admin-users.ts` → `apiFetch`; the API's ordering, paging and atomic PATCH are used as is; only early name feedback is duplicated. Loading (Suspense skeleton, "Salvando…"), failure (`error.tsx` for the list, in-row alert with kept values for saves) and empty (three explicit messages) states in [contracts/ui-users.md](contracts/ui-users.md). Unit tests cover the error mapping. |
| III. Two sign-in methods, one set of access rules | Yes | Page, redirect page and action all call `requireRole("ADMINISTRATOR")`, which asks the API about the token regardless of sign-in method. Unit tests: action refused with a CLIENT token and with no token. Quickstart 9–10 cover signed-out, client, Google and password sessions. Existing proxy tests cover `/admin/:path*`. |
| IV. Plans document compliance verification | Yes | This table. |

**Gate result (pre-research)**: PASS. **Post-design re-check**: PASS — no new routes outside `/admin`, no
client-side token use, no state outside the API; removing the search follows the API's own design.

## Project Structure

### Documentation (this feature)

```text
specs/011-admin-user-list-edit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api-users.md     # API calls relied on (035/036)
│   └── ui-users.md      # List, row edit, confirmation, keyboard behaviour
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── api.ts                  # + "PATCH" in ApiOptions.method
│   ├── admin-users.ts          # UPDATE: Account/Page types per 035/036 (no createdAt, new link names);
│   │                           #   listUsers({role,status,page,size}) without the 404→null fallback;
│   │                           #   NEW editUser(id,{name?,role?}) PATCH; REMOVE getUser, renameUser,
│   │                           #   changeUserRole; keep getMyId, labels
│   └── user-edit.ts            # UPDATE: UserRowState (idle/unchanged/saved/error), changedFields();
│                               #   parseRoleFilter/parseStatusFilter replace normalizeSearch; keep
│                               #   validateName, readUserEdit, parsePage
├── app/admin/usuarios/
│   ├── page.tsx                # REWORK: filters form, Suspense, renders <UserList>, paging, empty states
│   ├── UserList.tsx            # NEW client: editingId / dirty / discard prompt
│   ├── UserRow.tsx             # NEW client: view/edit modes, useActionState, profile confirmation
│   ├── actions.ts              # REWRITE: saveUserRowAction(id, prev, formData) → PATCH + refresh()
│   ├── users.module.css        # UPDATE: row edit/confirm styles; drop search and facts styles
│   └── [id]/
│       ├── page.tsx            # REPLACE: requireRole + redirect("/admin/usuarios")
│       ├── UserEditForm.tsx    # DELETE (logic moves to UserRow)
│       └── not-found.tsx       # DELETE
tests/unit/
├── admin-users.test.ts         # UPDATE: list query mapping, editUser body, filters/page parsing
└── admin-users-action.test.ts  # REWRITE: row action behaviour
```

**Structure Decision**: Same single Next.js project and split as 010: server-only API access in
`src/lib/admin-users.ts`, client-safe rules in `src/lib/user-edit.ts` shared by `UserRow` and the action,
route-local components next to `page.tsx`.

## Key design decisions (details in [research.md](research.md))

- **R1** One atomic `PATCH /v1/users/{id}` replaces rename + role PUTs; no partial success.
- **R2** "em breve" fallback removed; the endpoint exists.
- **R3** Text search removed (API has none, by design); `perfil`/`situacao` filters, unknown values ignored.
- **R4** Rows switch between view and edit; one row edited at a time; in-row discard prompt.
- **R5** Per-row Server Action bound to the id; changed fields only; `refresh()` and the saved account
  returned; no redirect, so page and filters are kept.
- **R6** API errors mapped to in-row messages; typed values kept.
- **R7** Own row read-only (API 035 refuses self-edits with 403); `writeUserName` no longer used here.
- **R8** `/admin/usuarios/{id}` redirects to the list.
- **R9** `apiFetch` gains PATCH.
- **R10** Page size 20; site-built page links keep filters; past-the-end page has its own empty state.

## Complexity Tracking

No constitution violations.
