# Research: Administrator user management (010)

Each entry: **Decision**, **Rationale**, **Alternatives considered**.

## R1 — What the API offers today, and what it must add

**Findings** (entrePatasETurnosAPI at `4430be9`, the image in production):

| Need | Exists? | Endpoint |
|---|---|---|
| Change a user's role | Yes | `PUT /v1/users/{id}/role` `{ "role": "CLIENT" \| "ADMINISTRATOR" }` → `200` audit record; `404 not_found` for an unknown id; administrator-only; audited (who, when, from, to) |
| The caller's own id and name | Yes | `GET /v1/users/me` → `{ id, name, featuredPhoto?, _links }` |
| List / search users | **No** | — |
| Read one user (name, e-mail, role, status) | **No** | `GET /v1/users/{id}/registration` exists but is about the registration, not the account summary |
| Change another user's name | **No** | — |

**Decision**: The web feature depends on three new API endpoints, specified for the API team in
[contracts/api-users.md](contracts/api-users.md):

1. `GET /v1/users?q=&page=&size=` (administrator) — paged summaries.
2. `GET /v1/users/{id}` (administrator) — one summary.
3. `PUT /v1/users/{id}/name` `{ "name": "..." }` (administrator) — rename, answers the updated summary.

The existing role endpoint is used as is.

**Rationale**: Web constitution Principle II: operations covered by the API go through the API, never
around it. Renaming is a write to `users`; the API's constitution bounds request-path writes to a
numbered list of operations (currently up to 12), so the API feature must add one (renaming by an
administrator) through its own amendment. That is the API's work, recorded here as a dependency.

**Alternatives considered**:
- *Rename via re-registration or Google sign-in*: does not exist and is not what was asked.
- *Inline editing in the list, no single-user read*: saves one endpoint, but the edit screen would
  have to be fed by a list search, which breaks on reload and deep links. Rejected.

## R2 — Shipping before the API is ready

**Decision**: Follow the bath-appointments precedent (`src/lib/baths.ts`, spec 007): when
`GET /v1/users` answers `404` (collection missing), the data function returns `null` and the page shows
an "em breve" state instead of an error. The nav link is shown in both cases.

**Rationale**: Lets the web and API ship independently without a broken page in between; same pattern
the admin already knows.

**Alternatives considered**: hide the link until the API is ready (needs a flag or a second deploy);
fail with an error page (misleading).

## R3 — When does a profile change take effect?

**Finding**: The role is not inside the access token. `fetchRole` in `src/lib/auth.ts` asks the API on
every page render (cached per request), and the API reads the role from the database on every request
(`AccountRoleAugmentor`).

**Decision**: A changed profile applies on the affected user's **next page load or API call**. No
session revocation is needed. The spec's assumption ("within about 15 minutes") is corrected to this.

**Rationale**: It is what the existing design already guarantees; nothing to build.

## R4 — Blocking self-demotion

**Finding**: `RoleChangeService` does not refuse a change to the caller's own account.

**Decision**: Enforce in the web at two layers:
- The edit page compares the target id with `GET /v1/users/me`'s `id`; for the caller's own account
  the profile control is rendered read-only with an explanation.
- The Server Action repeats the check before calling the role endpoint and refuses with a message
  (a crafted request cannot bypass the page).

Recommend (non-blocking) that the API also refuse `id == caller` with `409 own_role_change_forbidden`,
listed in the API contract as optional; the web maps that code if it appears.

**Rationale**: FR-009 / SC-004. The page check is the UX; the action check is the guarantee on the web
side; the API check would be the real authority and is suggested.

## R5 — Confirming a profile change (FR-008)

**Decision**: An in-page confirmation step, not `window.confirm`. When the profile select differs
from the saved profile, "Salvar" first reveals a confirmation panel ("Tornar **Maria** Administrador(a)?"
with "Confirmar" and "Cancelar"), focused when shown. Confirming submits the form with a hidden
`confirmRole=1`. The Server Action ignores a role change without `confirmRole=1`.

**Rationale**: Keyboard-usable and screen-reader friendly (Principle I), works the same on mobile, and
the server-side flag means the step cannot be skipped by a crafted submit. Native dialogs block the page
and are inconsistent across mobile browsers.

**Alternatives considered**: `window.confirm` (inaccessible styling, blocks); separate confirmation
page (extra round trip, loses typed name).

## R6 — Saving two fields with two endpoints

**Decision**: One form, one Server Action. The form carries the original name and role as hidden
fields; the action sends only what changed: rename first, then role. Results:
- nothing changed → "Nada para salvar." (no API call);
- all sent changes succeeded → redirect to `/admin/usuarios/{id}?aviso=salvo`;
- the rename failed → nothing else sent; error shown, values kept;
- the rename succeeded and the role failed → stay on the page with "Nome salvo. O perfil não foi
  alterado: <motivo>." and the saved name now shown as the original.

**Rationale**: Spec edge case "both fields changed". Rename first because it is the lower-risk change,
so a failing role change never leaves a role changed with an unsaved name.

**Alternatives considered**: ask the API for one combined `PATCH /v1/users/{id}` — cleaner, but the role
endpoint already exists with its audit semantics; changing it is out of proportion for this feature.

## R7 — Search and pagination

**Decision**: Search is a plain GET form (`/admin/usuarios?busca=...&pagina=N`), server-rendered, page
size 20, using the same pagination markup as `/admin/hospedagens`. Search text is trimmed, capped at
100 characters, and passed to the API as `q`. No type-ahead.

**Rationale**: Works without JavaScript, shareable URLs, back button behaves, and matches the existing
admin list.

## R8 — The signed-in admin's own name in the header

**Finding**: The header name comes from the `ept_name` cookie written at sign-in.

**Decision**: When an administrator renames **themselves**, the action also rewrites `ept_name` with the
saved name, so the header is correct immediately.

## R9 — Testing approach

**Decision**: Vitest unit tests (`tests/unit/`), stubbing `fetch` as the existing tests do:
- `admin-users.test.ts`: data functions (query building, `null` on missing collection, mapping).
- `admin-users-action.test.ts`: the Server Action — change detection, rename-then-role order, partial
  failure messages, self-change refusal, `confirmRole` requirement, non-admin refusal, error-code
  mapping, `ept_name` rewrite on self-rename.
- Extend `proxy.test.ts` only if the matcher changes (it does not: `/admin/:path*` already covers
  `/admin/usuarios`).

Principle III (both sign-in methods): access depends on `requireRole("ADMINISTRATOR")`, which reads the
API's answer for the token and is independent of how the session started; a test covers the guard for a
CLIENT token and a missing token.
