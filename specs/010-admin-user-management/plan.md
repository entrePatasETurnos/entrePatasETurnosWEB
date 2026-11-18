# Implementation Plan: Administrator user management

**Branch**: `010-admin-user-management` | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-admin-user-management/spec.md`

## Summary

Add a "Usuários" section to the administrator panel: a searchable, paged list at `/admin/usuarios` and
an edit screen at `/admin/usuarios/{id}` where an administrator changes a user's **name** and
**profile** (Cliente / Administrador). The link sits in the admin section navigation shown on the
administrator home. Saving goes through one Server Action that sends only what changed — rename first,
then role — with an in-page confirmation step for profile changes and a two-layer block on changing
one's own profile.

The role change uses the API's existing `PUT /v1/users/{id}/role`. Listing, reading one user and
renaming need **three new API endpoints** ([contracts/api-users.md](contracts/api-users.md)); until
they exist, the list shows "em breve" instead of failing (research R2).

## Technical Context

**Language/Version**: TypeScript 5, Node ≥ 22

**Primary Dependencies**: Next.js 16.4.5 (App Router, Server Components, Server Actions, `proxy.ts`),
React 19.3; no new dependencies

**Storage**: N/A (all data in entrePatasETurnosAPI; the site keeps only session cookies)

**Testing**: Vitest 5 unit tests in `tests/unit/`, `fetch` stubbed; `npm run lint`, `npm run typecheck`

**Target Platform**: Node standalone server in Kubernetes behind NGINX; desktop and mobile browsers

**Project Type**: Web application (backend-for-frontend over entrePatasETurnosAPI)

**Performance Goals**: List and edit pages render in one API round trip each (plus the cached role
check); search under 10 s end to end for an administrator (SC-002)

**Constraints**: Server-only API access (`server-only`, tokens never reach the browser); keyboard-only
operable; no horizontal scroll at 320 px; Portuguese copy

**Scale/Scope**: Hundreds to low thousands of users; 2 new routes, 1 Server Action module, 1 data
module, 1 nav entry

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | How compliance is verified |
|---|---|---|
| I. Next.js and React, responsive and keyboard-usable | Yes | Built as App Router pages and a Client Component form. Quickstart scenario 8 (375 px, keyboard only); confirmation panel takes focus and `Esc` cancels; all controls are native inputs, links and buttons. |
| II. entrePatasETurnosAPI as the backend | Yes | Every read and write goes through `src/lib/admin-users.ts` → `apiFetch`. No rules re-implemented beyond early form feedback; API errors mapped to messages (tests). Loading (Suspense skeletons, pending button), failure (alert, kept values, `error.tsx`), empty (explicit messages) states are in the UI contract. Missing API endpoints are a declared dependency, not worked around. |
| III. Two sign-in methods, one set of access rules | Yes | Pages and action call `requireRole("ADMINISTRATOR")`, which asks the API about the token, independent of sign-in method. Unit tests: action refused for a CLIENT token and with no token. Quickstart scenario 7 covers Google and password sessions. Proxy matcher `/admin/:path*` already covers the new routes (existing proxy tests). |
| IV. Plans document compliance verification | Yes | This table. |

**Gate result (pre-research)**: PASS. **Post-design re-check**: PASS — the design adds no new access
path outside `/admin`, no client-side token use, and no state outside the API.

## Project Structure

### Documentation (this feature)

```text
specs/010-admin-user-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api-users.md     # API endpoints used / required
│   └── ui-users.md      # Screens, copy, keyboard behaviour
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── admin-users.ts          # NEW server-only: types, listUsers (null on missing collection),
│   │                           #     getUser, renameUser, changeUserRole, getMyId, labels
│   └── user-edit.ts            # NEW client-safe: form state types, readUserEdit, validateUserEdit
├── app/admin/
│   ├── AdminNav.tsx            # + "Usuários" entry
│   ├── admin.module.css        # + list-row / badge styles (or a users.module.css)
│   └── usuarios/
│       ├── page.tsx            # NEW list: search form, rows, pagination, empty / "em breve"
│       ├── actions.ts          # NEW "use server": saveUserAction(id, prev, formData)
│       └── [id]/
│           ├── page.tsx        # NEW edit page: facts, notice, <UserEditForm>, notFound()
│           └── UserEditForm.tsx# NEW client: form, confirmation panel, focus handling
tests/unit/
├── admin-users.test.ts         # NEW data functions
└── admin-users-action.test.ts  # NEW Server Action behaviour
```

**Structure Decision**: Single Next.js project, following the existing admin layout
(`src/app/admin/hospedagens`) and the split used by spec 009: server-only API access in `src/lib/*.ts`,
client-safe validation in its own module so the form and the action share it.

## Key design decisions (details in research.md)

- **R1** Three new API endpoints required; role endpoint reused.
- **R2** `listUsers` returns `null` on a `404` collection → "em breve".
- **R3** Role change effective on the user's next page load (role is read from the API per request);
  spec assumption corrected accordingly.
- **R4** Self profile change blocked in the page and again in the action (`GET /v1/users/me` id).
- **R5** In-page confirmation panel; action requires `confirmRole=1` for a role change.
- **R6** One action, only changed fields, rename before role, explicit partial-success message.
- **R7** GET search form `?busca=&pagina=`, page size 20.
- **R8** Self-rename rewrites the `ept_name` cookie.

## Complexity Tracking

No constitution violations.
