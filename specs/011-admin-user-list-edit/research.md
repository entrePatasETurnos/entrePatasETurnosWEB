# Research: Administrator edits users straight from the user list (011)

Sources read: API specs `035-admin-edit-account` and `036-admin-user-list` (contracts `rest-api.md`),
the 010 implementation (`src/lib/admin-users.ts`, `src/app/admin/usuarios/**`, `src/lib/user-edit.ts`),
and the Next.js 16 docs in `node_modules/next/dist/docs/` (`07-mutating-data.md`, `functions/refresh.md`).

## R1 — Which API calls

**Decision**: List with `GET /v1/users?role=&status=&page=&size=` (API 036). Save a row with **one**
`PATCH /v1/users/{id}` carrying only the changed fields, `name` and/or `role` (API 035). Keep
`GET /v1/users/me` to recognise the administrator's own row. Stop using `PUT /v1/users/{id}/name` (never
existed), `PUT /v1/users/{id}/role` and `GET /v1/users/{id}`.

**Rationale**: PATCH is atomic ("both or neither"), which is exactly FR-007, and removes 010's
partial-success path (rename saved, role refused). It also writes the role-change audit record.

**Alternatives**: Keep the PUT role endpoint for role and PATCH for name — two requests, partial success
returns, rejected.

## R2 — Drop the "em breve" fallback

**Decision**: `listUsers` no longer maps a `404` to `null`; any failure goes to the error state.

**Rationale**: The endpoint is deployed (API 036 status: Implemented). Keeping the fallback would hide a
real misconfiguration behind "coming soon".

## R3 — No text search; filters instead

**Decision**: Remove the `busca` search. Add two optional filters, Perfil (`perfil=CLIENT|ADMINISTRATOR`)
and Situação (`situacao=ACTIVE|PENDING_EMAIL_VERIFICATION|DISABLED`), in a GET form, plus `pagina`.
Unknown values in the site's own query string are ignored (treated as absent) before calling the API, so
the API's `400` for unknown filter values is never reached from a hand-edited URL.

**Rationale**: API 036 deliberately has no search (e-mails in query strings end up in logs). Filtering
in the browser would only cover the current page, which breaks SC-002's "every account" promise.

## R4 — Inline editing model

**Decision**: The list stays a Server Component that fetches the page; each row is rendered by a Client
Component `UserRow` with two modes, *view* and *edit*. A small client wrapper `UserList` holds which row is
being edited (`editingId`) and whether it has unsaved changes, so only one row is in edit mode at a time.
Starting another row's edit while the current one is dirty shows an in-row "Descartar alterações?" panel
(no `window.confirm`, which the project avoids and which is not stylable).

Edit mode shows a text input for the name and a two-option radio group for the profile, with "Salvar" and
"Cancelar". `Esc` cancels. On entering edit mode, focus goes to the name input; on leaving it, focus returns
to the row's "Editar" button.

**Alternatives**: Always-editable rows (every row a live form) — noisy for 20 rows on a phone, easy to
change something by accident, rejected. A modal dialog — more focus-trap code, and the request says "this
list can change", rejected.

## R5 — Saving: Server Action per row, then `refresh()`

**Decision**: `saveUserRowAction(id, prev, formData)` in `src/app/admin/usuarios/actions.ts`, bound on
the server with the row's id (`saveUserRowAction.bind(null, user.id)`), used through `useActionState`.
It:

1. `requireRole("ADMINISTRATOR")`;
2. reads `name`, `role`, `originalName`, `originalRole`, `confirmRole`;
3. validates the name (shared `validateName`) and the role (`isUserRole`);
4. builds the body from the changed fields only; nothing changed → `{ status: "unchanged" }`, no request;
5. refuses when the target is the caller (`getMyId`), without calling the API;
6. refuses a role change without `confirmRole=1`;
7. sends the PATCH; on `200` calls `refresh()` (from `next/cache`) and returns
   `{ status: "saved", user }` with the API's answer, so the row shows exactly what was saved.

No `redirect`: the administrator stays on the same page, page number and filters.

**Rationale**: Next 16 docs: `refresh()` "refreshes the client router … ensuring the UI reflects the latest
state" and may only be called in Server Actions. The row also uses the returned account immediately so
it does not wait on the refresh.

## R6 — Error mapping

| API answer | Row shows |
|---|---|
| `400` with `fields.name` | that text under the name input |
| `400` with `fields.role` | "Perfil inválido." |
| `400` other | "Não foi possível salvar. Confira os dados." |
| `401` | "Sua sessão expirou. Entre novamente." |
| `403` | "Você não tem permissão para fazer isso." (also covers a self-edit the page missed, and an administrator demoted meanwhile; the next page load sends them away) |
| `404` | "Usuário não encontrado." + "Recarregar lista" link |
| other / network | "Não foi possível salvar agora. Tente novamente." |

Typed values are kept in every error case (FR-009). Messages render in a `role="alert"` region of the row.

## R7 — The administrator's own row

**Decision**: Read-only: no "Editar" button; a short hint "Este é você. Peça a outro administrador para
alterar seus dados." The action refuses it too (R5 step 5), and the API refuses it with `403`.

**Rationale**: API 035 returns `403` for the caller's own account; offering an edit that always fails would
be worse than not offering it. Consequence: 010's self-rename cookie update (`writeUserName`) is no longer
reachable from this area and is dropped from the action.

## R8 — The old edit screen

**Decision**: `src/app/admin/usuarios/[id]/page.tsx` becomes a `redirect("/admin/usuarios")` (after
`requireRole`), and `UserEditForm.tsx` and `[id]/not-found.tsx` are deleted. The confirmation panel's
markup, copy and focus handling move into `UserRow`.

## R9 — `apiFetch` needs PATCH

**Decision**: Add `"PATCH"` to `ApiOptions.method`. Nothing else changes in `src/lib/api.ts`.

## R10 — Paging

**Decision**: Page size 20 (API default, sent explicitly). The site's links are built from
`page.totalPages` and the current `pagina`, keeping `perfil`/`situacao`. The API's `_links` hrefs are API
paths and are not shown to the browser. A `pagina` past the last page gives the empty state with a
"Voltar à primeira página" link.
