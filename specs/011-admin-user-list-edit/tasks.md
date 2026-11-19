---

description: "Task list for 011 — administrator edits users straight from the user list"
---

# Tasks: Administrator edits users straight from the user list

**Input**: Design documents from `specs/011-admin-user-list-edit/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-users.md, contracts/ui-users.md, quickstart.md

**Tests**: Included. Constitution Principle III requires automated checks that signed-out and client users
cannot use protected features, and the plan names `tests/unit/admin-users.test.ts` and
`tests/unit/admin-users-action.test.ts`. Tests use Vitest 5 with `fetch` stubbed by route (see the existing
`tests/unit/admin-users-action.test.ts` for the `api()` helper, the `next/headers` cookie mock and the
`next/navigation` redirect mock; add a `vi.mock("next/cache", () => ({ refresh: vi.fn() }))`).

**Organization**: Tasks are grouped by user story. Before writing Next.js code, read the relevant guide in
`node_modules/next/dist/docs/` (AGENTS.md): at least `01-app/01-getting-started/07-mutating-data.md` and
`01-app/03-api-reference/04-functions/refresh.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 list, US2 rename, US3 profile, US4 filters (spec.md)

---

## Phase 1: Setup

**Purpose**: Branch and the one shared infrastructure change.

- [X] T001 Create and switch to branch `011-admin-user-list-edit` from `010-admin-user-management` (`git switch -c 011-admin-user-list-edit`)
- [X] T002 Add `"PATCH"` to the `method` union of `ApiOptions` in `src/lib/api.ts` (research R9); nothing else in the file changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data access and shared rules every story uses. Add new things here; obsolete 010 code is
removed in the Polish phase, once nothing imports it.

- [X] T003 In `src/lib/admin-users.ts`, update types to API 035/036 (data-model.md): `UserSummary` loses `createdAt`, `_links` keys become `self` / `edit` / `change-role`; `UserPage` gains optional `_links`. Add `export type UserStatusFilter = "ACTIVE" | "PENDING_EMAIL_VERIFICATION" | "DISABLED"`
- [X] T004 In `src/lib/admin-users.ts`, change `listUsers(token, opts: { role?: UserRole; status?: UserStatusFilter; page?: number; size?: number })` to send `role`, `status`, `page`, `size` (no `q`), and return `Promise<UserPage>`: remove the `404 → null` fallback so every failure throws (research R2)
- [X] T005 In `src/lib/admin-users.ts`, add `editUser(token, id, changes: { name?: string; role?: UserRole })` → `apiFetch<UserSummary>(\`/v1/users/${id}\`, { method: "PATCH", token, body: changes })` (contracts/api-users.md); keep `getMyId`, `ROLE_LABELS`, `STATUS_LABELS`, `statusLabel`
- [X] T006 [P] In `src/lib/user-edit.ts`, add `UserRowState` exactly as in data-model.md (`idle` | `unchanged` | `saved` with `user` | `error` with `values`, `fieldErrors`, `formError?`, `notFound?`) and `INITIAL_USER_ROW_STATE`; add `changedFields(input: UserEditInput, role: UserRole): { name?: string; role?: UserRole }` returning only fields that differ from `originalName` / `originalRole`; add `STATUS_FILTERS` constant (`ACTIVE`, `PENDING_EMAIL_VERIFICATION`, `DISABLED`). Keep `validateName`, `readUserEdit`, `isUserRole`, `parsePage`, `NAME_MAX_LENGTH`
- [X] T007 [P] Update `tests/unit/admin-users.test.ts` for the foundation: `listUsers` sends `?page=0&size=20` with no `q`, adds `role`/`status` only when given, and throws on `404` and `500`; `editUser` sends `PATCH /v1/users/7` with exactly the given body; `changedFields` returns `{}` / `{name}` / `{role}` / both. Remove the `getUser`, `renameUser`, `changeUserRole` and `normalizeSearch` cases

**Checkpoint**: `npm run typecheck` may still fail in `src/app/admin/usuarios/**` (old imports) until US1–US2 rework them; `npm test -- admin-users.test` passes.

---

## Phase 3: User Story 1 - See every user when opening "Usuários" (Priority: P1) 🎯 MVP

**Goal**: The tab loads `GET /v1/users` and shows every account (name, e-mail, profile, status, "(você)"), paged, with loading, error and empty states. Rows are view-only in this phase.

**Independent Test**: Quickstart scenario 1 — with ≥ 21 accounts, open "Usuários" as an administrator and page to the end; every account appears exactly once, own row marked "(você)"; a client is sent away (scenario 9).

- [X] T008 [P] [US1] Create `src/app/admin/usuarios/UserRow.tsx` (`"use client"`) with view mode only for now: props `user: UserSummary`, `isSelf: boolean`; renders name (+ " (você)" with `styles.you`), profile badge (`styles.badge` + `badgeAdmin`/`badgeClient`, label from `ROLE_LABELS`), e-mail, and status via `statusLabel` only when not `ACTIVE`. Own row shows the hint "Este é você. Peça a outro administrador para alterar seus dados." (contracts/ui-users.md). Import labels from a client-safe place: move `ROLE_LABELS`, `STATUS_LABELS`, `statusLabel` into `src/lib/user-edit.ts` and re-export them from `src/lib/admin-users.ts` (admin-users is `server-only`)
- [X] T009 [P] [US1] Create `src/app/admin/usuarios/UserList.tsx` (`"use client"`): props `users: UserSummary[]`, `myId: number`, `rowAction` factory omitted for now; renders `<ul className={styles.rows}>` with one `<li>` + `<UserRow>` per user, keyed by `id`
- [X] T010 [US1] Rework `src/app/admin/usuarios/page.tsx`: intro text "Corrija o nome ou mude o perfil de qualquer pessoa direto na lista."; remove the search form, `busca`, the "em breve" branch and the `<Link>` rows; `Users` calls `requireRole("ADMINISTRATOR")`, then `Promise.all([listUsers(token, { page, size: PAGE_SIZE }), getMyId(token)])` and renders `<UserList>`; keep `<Suspense fallback={<LoadingRows />}>`; empty states: no items and `page === 0` → "Nenhum usuário cadastrado."; no items and `page > 0` → "Esta página não existe." + link "Voltar à primeira página" (research R10); pagination "← Anteriores / Página N de M / Próximas →" via a `pageHref(target)` that builds `?pagina=` (filters added in US4). Load failures fall through to the existing `src/app/admin/error.tsx`
- [X] T011 [P] [US1] Replace `src/app/admin/usuarios/[id]/page.tsx` with a page that awaits `requireRole("ADMINISTRATOR")` and then `redirect("/admin/usuarios")` (research R8); delete `src/app/admin/usuarios/[id]/not-found.tsx`
- [X] T012 [P] [US1] Update `src/app/admin/usuarios/users.module.css`: row layout for a non-link `<li>` (name/badge/e-mail/status grid that wraps at 320 px, no horizontal scroll), an actions slot on the right for the future "Editar" button, `.selfHint` style; remove `.search`, `.searchField`, `.clear`, `.facts`, `.back` and the link hover/focus styles of `.row`
- [X] T013 [P] [US1] Add to `tests/unit/admin-users.test.ts` an access check for the list path: `requireRole("ADMINISTRATOR")` with a CLIENT token redirects to the client home and with no token redirects to `/entrar` (reuse the role-check stub `GET /v1/accommodation-bookings` → 403 / no cookie), so `listUsers` is never called
  - *Done in `tests/unit/admin-users-action.test.ts` ("guards the list page the same way"), which already has the cookie and redirect mocks.*

**Checkpoint**: US1 complete — list, paging, empty and error states work; `/admin/usuarios/{id}` lands on the list.

---

## Phase 4: User Story 2 - Rename a user directly in the list (Priority: P1)

**Goal**: "Editar" opens the row in place; the name is saved through one PATCH; the row shows the saved name; validation, cancel, errors and one-row-at-a-time behave per contracts/ui-users.md.

**Independent Test**: Quickstart scenarios 2, 3, 4 and 7 — rename a test user in the list, reload, the new name persists; invalid name blocked inline; `Esc` restores values; switching rows with unsaved changes asks to discard.

### Tests for User Story 2

- [X] T014 [P] [US2] Rewrite `tests/unit/admin-users-action.test.ts` for `saveUserRowAction` (name path), keeping the file's `api()` stub and mocks and adding the `next/cache` mock: refused (redirect to `/entrar`) with no token; CLIENT token redirected and no PATCH sent; blank / > 255-char name → `error` with `fieldErrors.name`, no PATCH; name unchanged and role unchanged → `{ status: "unchanged" }`, no PATCH; target id === `/me` id → `error` "Você não tem permissão para fazer isso.", no PATCH; changed name → exactly one `PATCH /v1/users/7` with body `{ name: "<trimmed>" }`, `refresh` called once, result `{ status: "saved", user }` from the API answer; API `400 fields.name` → that text in `fieldErrors.name`; `401`, `403`, `404` (`notFound: true`), `500` and a thrown network error → the messages of research R6, values kept, `refresh` not called

### Implementation for User Story 2

- [X] T015 [US2] Rewrite `src/app/admin/usuarios/actions.ts` as `"use server"` exporting `saveUserRowAction(id: number, _prev: UserRowState, formData: FormData): Promise<UserRowState>` per research R5 steps 1–7 (role path included but the confirmation rule is completed in T019): `requireRole`; `readUserEdit`; `validateName`; role via `isUserRole` else error "Perfil inválido."; `changedFields` empty → `unchanged`; `getMyId(token) === id` → error "Você não tem permissão para fazer isso."; `editUser`; on success `refresh()` from `next/cache` and return `saved`. Error mapping function per research R6 (keep 010's `console.error` without personal data). Remove `redirect`, `cookies`, `writeUserName`, `renameUser`, `changeUserRole` usage
- [X] T016 [US2] Add edit mode to `src/app/admin/usuarios/UserRow.tsx`: new props `editing: boolean`, `onEdit()`, `onClose()`, `onDirtyChange(dirty: boolean)`, `action` (bound `saveUserRowAction`); keep a local `saved` copy of `{ name, role }` updated from a `saved` action result. View mode: "Editar" button (`aria-label="Editar <nome>"`, absent when `isSelf`). Edit mode: `<form action={formAction} noValidate aria-busy={pending}>` with hidden `originalName`/`originalRole`/`confirmRole`, "Nome completo" input (`maxLength={NAME_MAX_LENGTH}`, `autoComplete="off"`, focused on open), "Perfil" fieldset radios, "Salvar" ("Salvando…" + disabled while pending) and "Cancelar". Client check with `validateName` before submit (error under the field, `aria-invalid`, `aria-describedby`, focus). `Esc` in the row = Cancelar. On `saved`: close, show `role="status"` "Alterações salvas." in the row, focus "Editar". On `unchanged`: close silently. On `error`: stay open, keep typed values (remount inputs keyed by the error like 010's `UserEditForm`), show `role="alert"` box focused; when `notFound`, add link "Recarregar lista" to `/admin/usuarios`. Report `dirty` from input changes. Reuse focus/remount patterns from `src/app/admin/usuarios/[id]/UserEditForm.tsx` before it is deleted
- [X] T017 [US2] Extend `src/app/admin/usuarios/UserList.tsx` with `editingId`, `dirty`, `pendingSwitch` (data-model.md "List coordination"): `onEdit(id)` opens directly when nothing is dirty, otherwise sets `pendingSwitch`; render in the editing row a `role="group"` `tabIndex={-1}` panel (focused) "Descartar alterações em <nome>?" with "Descartar" (open `pendingSwitch`) and "Continuar editando" (clear it, focus back to the name input). Pass `action={saveUserRowAction.bind(null, user.id)}` from `page.tsx` as a `rowActions: Record<number, action>` prop (bind on the server, research R5), and update `page.tsx` accordingly
- [X] T018 [P] [US2] Add edit-mode styles to `src/app/admin/usuarios/users.module.css`: inline form layout stacking on narrow screens, `.rowStatus` success message, reuse `.field`, `.input`, `.fieldError`, `.formError`, `.actions`, `.button`, `.buttonSecondary`, `.confirm` from 010; visible focus ring on every control

**Checkpoint**: US1 + US2 complete — names can be corrected from the list.

---

## Phase 5: User Story 3 - Change a user's profile directly in the list (Priority: P1)

**Goal**: Profile switch with in-row confirmation; name + profile saved atomically; own row locked.

**Independent Test**: Quickstart scenarios 5 and 6 — promote a client from the list (confirm), they reach `/admin` on next page load; decline sends nothing; name + profile together are both saved or neither.

### Tests for User Story 3

- [X] T019 [P] [US3] Add to `tests/unit/admin-users-action.test.ts`: role changed without `confirmRole=1` → `error` "Confirme a mudança de perfil.", no PATCH; with `confirmRole=1` → one `PATCH /v1/users/7` body `{ role: "ADMINISTRATOR" }`; name and role changed + confirmed → one PATCH with both fields; unknown role value → "Perfil inválido.", no PATCH; API `400 fields.role` → "Perfil inválido."; own id with a role change → refused before any PATCH; a single failed PATCH with both fields reports one error and no "saved" part (no partial success)

### Implementation for User Story 3

- [X] T020 [US3] In `src/app/admin/usuarios/actions.ts`, require `confirmRole === true` when `changedFields` contains `role` (error "Confirme a mudança de perfil."), and map API `400 fields.role` to "Perfil inválido." (research R6)
- [X] T021 [US3] Add the profile confirmation to `src/app/admin/usuarios/UserRow.tsx`: on "Salvar" with the selected role ≠ saved role and not yet confirmed, prevent submit and show the in-row panel (`role="group"`, `tabIndex={-1}`, focused, `aria-labelledby`) "Tornar **<nome digitado>** <Administrador|Cliente>?" plus the consequence line ("Administradores veem e aprovam todos os pedidos." / "Deixará de acessar o painel do administrador."), "Confirmar" (sets hidden `confirmRole=1`, `requestSubmit()`, resets it) and "Cancelar" (hide, focus "Salvar"); `Esc` = Cancelar. Copy text and handlers from 010's `UserEditForm` (`CONSEQUENCE`, `confirm`, `cancel`, `onPanelKeyDown`)
- [X] T022 [US3] After a `saved` result in `src/app/admin/usuarios/UserRow.tsx`, update the badge from `user.role` in the API answer (not from the form), so the row shows exactly what the API saved (SC-005)

**Checkpoint**: All P1 stories complete — the request is fully delivered.

---

## Phase 6: User Story 4 - Narrow the list by profile or status (Priority: P3)

**Goal**: `perfil` / `situacao` filters, kept across pages, unknown values ignored.

**Independent Test**: Quickstart scenario 8 — Perfil = Administrador shows only administrators; page links keep the filter; `?perfil=XYZ` shows everyone; "Limpar filtros" resets.

- [X] T023 [P] [US4] In `src/lib/user-edit.ts`, add `parseRoleFilter(raw: unknown): UserRole | undefined` and `parseStatusFilter(raw: unknown): UserStatusFilter | undefined` (first value of an array; anything not in `USER_ROLES` / `STATUS_FILTERS` → `undefined`, research R3); define `UserStatusFilter` here and re-export it from `src/lib/admin-users.ts`
- [X] T024 [P] [US4] Add unit tests for `parseRoleFilter` / `parseStatusFilter` (valid, empty, unknown, array, wrong case) and for `listUsers` passing `role=ADMINISTRATOR&status=DISABLED` in `tests/unit/admin-users.test.ts`
- [X] T025 [US4] In `src/app/admin/usuarios/page.tsx`, read `perfil` / `situacao` with the parsers, pass them to `listUsers`, add a GET form above the list with `<select name="perfil">` "Perfil" (Todos / Cliente / Administrador) and `<select name="situacao">` "Situação" (Todas / Ativo / Aguardando confirmação de e-mail / Desativado), preselected from the URL, and button "Filtrar"; "Limpar filtros" link to `/admin/usuarios` when any filter is set; `pageHref` keeps both filters; empty state with filters → "Nenhum usuário com esses filtros." + "Limpar filtros"
- [X] T026 [P] [US4] Add filter form styles (`.filters`, wrapping on narrow screens, labels above selects) to `src/app/admin/usuarios/users.module.css`

**Checkpoint**: All stories complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T027 Delete `src/app/admin/usuarios/[id]/UserEditForm.tsx` (its logic now lives in `UserRow.tsx`)
- [X] T028 Remove now-unused code: `getUser`, `renameUser`, `changeUserRole` from `src/lib/admin-users.ts`; `normalizeSearch`, `SEARCH_MAX_LENGTH`, `UserEditState`, `INITIAL_USER_EDIT_STATE` from `src/lib/user-edit.ts`; `writeUserName` from `src/lib/session.ts` if `grep -rn writeUserName src tests` finds no other use
- [X] T029 [P] Update the `/admin/usuarios` row of the routes table in `README.md`: every account, filterable by profile and status, name and profile edited in the row; uses API `GET /v1/users` and `PATCH /v1/users/{id}` (specs 035/036, see `specs/011-admin-user-list-edit/contracts/api-users.md`); `/admin/usuarios/{id}` redirects to the list; drop the "em breve" note
- [X] T030 Run `npm run lint && npm run typecheck && npm test` and fix every failure
- [ ] T031 Run the manual scenarios in `specs/011-admin-user-list-edit/quickstart.md` (1–11), including keyboard-only at 375 px and both sign-in methods; record any deviation in this file
  - *Open: needs a running API (specs 035/036) and test accounts. Build, lint, typecheck and the 111 unit tests pass. Implementation note: the `/admin/usuarios/{id}` redirect runs inside `<Suspense>` because routes are prerendered (`next build` refused a cookie read outside it).*

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T002)** → **Foundational (T003–T007)** → user stories.
- **US1 (T008–T013)** first: it creates `UserRow`, `UserList` and the reworked page that US2–US4 extend.
- **US2 (T014–T018)** after US1.
- **US3 (T019–T022)** after US2 (same action and the row's edit mode).
- **US4 (T023–T026)** after US1 only; can run in parallel with US2/US3 except that T025 and T017 both edit `page.tsx` — do them one after the other.
- **Polish (T027–T031)** after every story you are shipping. T028 only after T015 and T010 removed the old imports.

### Within phases

- T003 → T004 → T005 (same file). T006, T007 parallel to them.
- T008 (moves labels into `user-edit.ts`) before T023 (same file) — not in the same batch.
- T015 → T020 (same file); T016 → T021 → T022 (same file).

### Parallel opportunities

- Foundational: T006 and T007 alongside T003–T005.
- US1: T008, T009, T011, T012, T013 together; then T010.
- US2: T014 and T018 alongside T015; T016 then T017.
- US3: T019 alongside T020/T021.
- US4: T023, T024, T026 together; then T025.

## Parallel Example: User Story 1

```text
T008 UserRow view mode          (src/app/admin/usuarios/UserRow.tsx)
T009 UserList                   (src/app/admin/usuarios/UserList.tsx)
T011 [id] redirect              (src/app/admin/usuarios/[id]/page.tsx)
T012 row styles                 (src/app/admin/usuarios/users.module.css)
T013 access tests               (tests/unit/admin-users.test.ts)
→ then T010 page rework         (src/app/admin/usuarios/page.tsx)
```

## Implementation Strategy

### MVP

Phases 1–3 (US1): the tab shows the real list from the API. Usable immediately — the old edit page now
redirects, so editing is unavailable until US2; ship US1 alone only if that gap is acceptable, otherwise
treat US1 + US2 as the minimum release.

### Incremental delivery

1. Setup + Foundational.
2. US1 → validate quickstart 1, 9.
3. US2 → validate quickstart 2–4, 7 (names editable — recommended first release).
4. US3 → validate quickstart 5–6 (the full request).
5. US4 → validate quickstart 8.
6. Polish → lint, typecheck, tests, full quickstart, README.
