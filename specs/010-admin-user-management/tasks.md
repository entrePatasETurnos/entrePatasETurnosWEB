---

description: "Task list for 010 — administrator user management"
---

# Tasks: Administrator user management

**Input**: Design documents from `/specs/010-admin-user-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-users.md, contracts/ui-users.md, quickstart.md

**Tests**: Included. The plan (research R9) calls for Vitest unit tests, and constitution Principle III requires automated checks that non-administrators and signed-out users are refused.

**Organization**: Tasks are grouped by user story (spec.md): US1 find + rename (P1), US2 change profile (P1), US3 link from the admin home (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3
- Paths are relative to the repository root (single Next.js project: `src/`, `tests/unit/`)

## Conventions every task follows

- Read `node_modules/next/dist/docs/` for any Next.js API before using it (AGENTS.md): this is Next 16 (`proxy.ts`, async `searchParams`/`params`, `PageProps<"/route">`).
- API access only through `apiFetch` in a `server-only` module (`src/lib/api.ts`); tokens never reach Client Components.
- Every page calls `requireRole("ADMINISTRATOR")` from `src/lib/auth.ts` inside the Suspense'd async part, as `src/app/admin/hospedagens/page.tsx` does.
- Copy in Brazilian Portuguese, exactly as in `contracts/ui-users.md`.
- Tests stub `globalThis.fetch` with `vi.stubGlobal` and assert on the URL/method/body sent to `http://api.test` (see `tests/unit/registration.test.ts`, `tests/unit/painel.test.ts`). Mock `next/navigation` (`redirect`, `notFound`) and `next/headers` (`cookies`) with `vi.mock` where needed.

---

## Phase 1: Setup

**Purpose**: Branch and scaffolding

- [X] T001 Create and switch to git branch `010-admin-user-management` from the current branch, and confirm `.specify/feature.json` points at `specs/010-admin-user-management`
- [X] T002 Create empty directories `src/app/admin/usuarios/` and `src/app/admin/usuarios/[id]/` (files are added by later tasks)

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Shared types, API access and validation used by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `src/lib/admin-users.ts` (`import "server-only"`) with the types from data-model.md: `UserRole = "CLIENT" | "ADMINISTRATOR"`, `UserStatus` (`"ACTIVE" | "PENDING_EMAIL_VERIFICATION" | "DISABLED" | (string & {})`), `UserSummary` (`id, name, email, role, status, createdAt, _links?: Partial<Record<"self"|"rename"|"role", { href: string; method?: string }>>`), `UserPage` (`{ items, page: { number, size, totalItems, totalPages } }`); label maps `ROLE_LABELS` (Cliente / Administrador) and `STATUS_LABELS` (Ativo / Aguardando confirmação de e-mail / Desativado) plus `statusLabel(status)` that falls back to the raw value; and `isUserRole(value): value is UserRole`
- [X] T004 In `src/lib/admin-users.ts` add the API functions per contracts/api-users.md: `listUsers(token, { q?, page?, size? }): Promise<UserPage | null>` → `GET /v1/users` with only the set params (omit empty `q`), returning `null` when the API answers `404` on the collection (pattern: `listAllBaths` in `src/lib/baths.ts`); `getUser(token, id): Promise<UserSummary | null>` → `GET /v1/users/{id}`, `null` on `404`; `renameUser(token, id, name)` → `PUT /v1/users/{id}/name` body `{ name }`; `changeUserRole(token, id, role)` → `PUT /v1/users/{id}/role` body `{ role }`; `getMyId(token): Promise<number>` → `GET /v1/users/me`, returning `id`. Depends on T003
- [X] T005 [P] Create client-safe `src/lib/user-edit.ts` (no `server-only`) with: `NAME_MAX_LENGTH = 255`; `SEARCH_MAX_LENGTH = 100`; `UserEditValues = { name: string; role: UserRole }` (re-declare the role union locally so the module stays client-safe); `UserEditState = { status: "idle" } | { status: "error"; values: UserEditValues; fieldErrors: { name?: string }; formError?: string; saved?: { name: string } }`; `INITIAL_USER_EDIT_STATE`; `readUserEdit(formData)` returning `{ name (trimmed), role, originalName, originalRole, confirmRole: boolean }`; `validateName(name)` returning `"Informe o nome completo."` when empty or `"O nome deve ter no máximo 255 caracteres."` when longer; `normalizeSearch(raw)` (trim, cut to 100 chars); `parsePage(raw)` (integer ≥ 0, default 0)
- [X] T006 [P] Write `tests/unit/admin-users.test.ts` covering T004 (`listUsers` query building incl. omitted empty `q`, `null` on 404, error on 500; `getUser` `null` on 404; `renameUser`/`changeUserRole` method, path and JSON body; `getMyId` reads `id`) and T005 (`validateName` empty/whitespace/256 chars/255 chars; `normalizeSearch`; `parsePage` with `"-1"`, `"abc"`, `undefined`, `"3"`). Depends on T004, T005

**Checkpoint**: `npm test` passes; foundation ready

---

## Phase 3: User Story 1 — Find a user and change their name (Priority: P1) 🎯 MVP

**Goal**: An administrator lists/searches users at `/admin/usuarios`, opens one, and saves a new name.

**Independent Test**: As an administrator, open `/admin/usuarios` by address, search a test user, rename them, reload: the list and a booking card on `/admin/hospedagens` show the new name (quickstart scenarios 2, 3). Clients and signed-out visitors are refused.

### Tests for User Story 1

- [X] T007 [P] [US1] Write `tests/unit/admin-users-action.test.ts` (rename part) for `saveUserAction` in `src/app/admin/usuarios/actions.ts`: refuses with redirect when `requireRole` finds a CLIENT token and when there is no token (mock `@/lib/auth` or stub `/v1/accommodation-bookings?size=1` → 403 / no cookie); "Nada para salvar." and **no** API call when name and role equal the originals; blank name → `fieldErrors.name`, no API call; changed name → exactly one `PUT /v1/users/{id}/name` with the trimmed name, then `redirect` to `/admin/usuarios/{id}?aviso=salvo`; API `400` with `fields.name` → that message under name; `404` → `formError` "Usuário não encontrado."; `401` → "Sua sessão expirou. Entre novamente."; other failure → generic message, values kept; when the target id equals `getMyId`, the `ept_name` cookie is rewritten with `encodeURIComponent(savedName)`

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `src/app/admin/usuarios/users.module.css` with styles for the search form (label, input ≥ 44px high, button), user rows (link block with name, e-mail, role badge, status text, wrapping long e-mails with `overflow-wrap: anywhere`), the role badge variants (Cliente / Administrador), the edit facts list, the form fields, field/form errors and the confirmation panel; reuse tokens from `src/app/cadastro/cadastro.module.css` (`--teal-*`, `--copper-*`, `--focus-ring`, `--radius-*`) and visible `:focus-visible` outlines; no horizontal scroll at 320px
- [X] T009 [US1] Create `src/app/admin/usuarios/page.tsx` (list) per contracts/ui-users.md: static shell (`AppHeader`, `AdminNav current="usuarios"` — add the key in T020; until then temporarily pass `"inicio"`), intro "Usuários" / "Encontre uma pessoa para corrigir o nome ou mudar o perfil.", and an async `<Users>` inside `<Suspense fallback={<LoadingRows/>}>` that: calls `requireRole("ADMINISTRATOR")`; reads `busca` (`normalizeSearch`) and `pagina` (`parsePage`) from `await searchParams`; calls `listUsers(token, { q, page, size: 20 })` and `getMyId(token)` in parallel; renders the GET search form (`name="busca"`, label "Buscar por nome ou e-mail", "Buscar", and "Limpar busca" link when searching); when `listUsers` returns `null` renders "Gerenciar usuários estará disponível em breve."; renders rows as links to `/admin/usuarios/{id}` with name (+ " (você)" for own id), e-mail, `ROLE_LABELS` badge, `statusLabel` when not ACTIVE; empty states "Nenhum usuário encontrado para “{busca}”." / "Nenhum usuário cadastrado."; pagination like `src/app/admin/hospedagens/page.tsx` keeping `busca`. `export const metadata = { title: "Usuários" }`
- [X] T010 [US1] Create `src/app/admin/usuarios/actions.ts` (`"use server"`) with `saveUserAction(id: number, _prev: UserEditState, formData: FormData): Promise<UserEditState>` implementing the **name** part of research R6: `requireRole("ADMINISTRATOR")`; `readUserEdit`; validate name; if nothing changed return `formError: "Nada para salvar."`; if the name changed call `renameUser`, map errors (`400` `fields.name` → field error; `404` → "Usuário não encontrado."; `401` → session message; `403 forbidden` → "Você não tem permissão para fazer isso."; else log status/code only and return "Não foi possível salvar agora. Tente novamente."); on success, if `id === await getMyId(token)` rewrite cookie `COOKIE.name` (from `src/lib/session.ts`, same options as `writeSession` uses) and then `redirect(`/admin/usuarios/${id}?aviso=salvo`)`. Leave a clearly marked place for the role step (T015). Never read the target id from the form
- [X] T011 [P] [US1] Create `src/app/admin/usuarios/[id]/UserEditForm.tsx` (`"use client"`) taking `{ user: { id, name, role }, isSelf: boolean, action }` and rendering, with `useActionState(action, INITIAL_USER_EDIT_STATE)`: hidden `originalName`/`originalRole` (use `state.saved?.name` as the original name when set); "Nome completo" input (`name="name"`, `maxLength={255}`, `autoComplete="off"`, `defaultValue` from state values or user); a hidden `role` input carrying the current role (the profile fieldset replaces it in T016); "Salvar" button disabled while pending (label "Salvando…"); name error under the field with `aria-invalid`/`aria-describedby`, focused on a new error state; other errors in a `role="alert"` box with `tabIndex={-1}`, focused. Client-side `validateName` on submit for early feedback (pattern: `src/app/cadastro/RegistrationForm.tsx`)
- [X] T012 [US1] Create `src/app/admin/usuarios/[id]/page.tsx`: static shell (`AppHeader`, `AdminNav`), back link "← Usuários", and an async part in `<Suspense>` that calls `requireRole("ADMINISTRATOR")`, parses `(await params).id` as a positive integer (else `notFound()`), loads `getUser` and `getMyId` in parallel, calls `notFound()` when the user is `null`, shows heading = name, facts (e-mail, `statusLabel`, "Cliente desde" + date formatted with an existing helper from `src/lib/format.ts`), the `Notice` "Alterações salvas." when `aviso=salvo`, and `<UserEditForm user={...} isSelf={user.id === myId} action={saveUserAction.bind(null, user.id)} />`. Add `src/app/admin/usuarios/[id]/not-found.tsx` with "Usuário não encontrado." and a link to `/admin/usuarios`. `generateMetadata` → title "Editar usuário"
- [X] T013 [US1] Run `npm test`, `npm run lint`, `npm run typecheck`; fix failures in the files above

**Checkpoint**: US1 is fully usable by address; renaming works end to end against an API with the new endpoints

---

## Phase 4: User Story 2 — Change a user's profile (Priority: P1)

**Goal**: The edit screen changes the profile between Cliente and Administrador with an in-page confirmation, never for one's own account.

**Independent Test**: Promote a test client, confirm in the panel; that user's next page load lands on `/admin`. Demote back. On one's own account the profile is read-only, and a crafted POST is refused (quickstart scenarios 4, 5).

### Tests for User Story 2

- [X] T014 [P] [US2] Extend `tests/unit/admin-users-action.test.ts` with role cases: role changed **without** `confirmRole=1` → no role call, `formError` asking to confirm; role changed with `confirmRole=1` → one `PUT /v1/users/{id}/role` with `{ role }` then redirect `?aviso=salvo`; invalid role value (e.g. `"ROOT"`) → "Perfil inválido.", no call; target id equals `getMyId` → "Você não pode alterar o seu próprio perfil.", no role call (the rename, if any, still happens); both changed → rename call **before** role call; rename succeeds + role `404`/`409 own_role_change_forbidden`/`500` → state with `saved.name` and `formError` starting "Nome salvo. O perfil não foi alterado:"; rename fails → role endpoint never called

### Implementation for User Story 2

- [X] T015 [US2] Extend `saveUserAction` in `src/app/admin/usuarios/actions.ts` with the role step (research R4–R6): validate with `isUserRole` ("Perfil inválido."); if the role changed: refuse when `id === getMyId(token)`, require `confirmRole` (else `formError: "Confirme a mudança de perfil."`), call `changeUserRole` **after** a successful rename; map `404` → "Usuário não encontrado.", `409 own_role_change_forbidden` → "Você não pode alterar o seu próprio perfil.", `400` → "Perfil inválido.", others → generic; when the rename succeeded but the role failed return `{ status: "error", values, fieldErrors: {}, saved: { name }, formError: "Nome salvo. O perfil não foi alterado: " + reason }`. Fetch `getMyId` at most once per call
- [X] T016 [US2] In `src/app/admin/usuarios/[id]/UserEditForm.tsx` replace the hidden `role` input with a `<fieldset>`/`<legend>Perfil</legend>` of two radios (`name="role"`, values `CLIENT`/`ADMINISTRATOR`, labels Cliente/Administrador). When `isSelf`: radios `disabled`, plus a hidden `role` input with the current value, and the note "Você não pode alterar o seu próprio perfil. Peça a outro administrador." linked via `aria-describedby`
- [X] T017 [US2] In `src/app/admin/usuarios/[id]/UserEditForm.tsx` add the confirmation step (contracts/ui-users.md, research R5): on submit, if the selected role differs from `originalRole` and confirmation was not given yet, `preventDefault()` and show a panel (`tabIndex={-1}`, focused on open) reading "Tornar **{name}** {Administrador|Cliente}?" with the matching explanation ("Administradores veem e aprovam todos os pedidos." / "Deixará de acessar o painel do administrador."), a "Confirmar" button that sets hidden `confirmRole=1` and submits via `form.requestSubmit()`, and "Cancelar" that hides the panel and returns focus to "Salvar"; `Escape` inside the panel acts as Cancelar. Reset the confirmation flag when the panel closes or the state changes. Use the name currently typed in the input for the question
- [X] T018 [US2] Run `npm test`, `npm run lint`, `npm run typecheck`; fix failures

**Checkpoint**: US1 + US2 complete — the area fully manages name and profile

---

## Phase 5: User Story 3 — Reach the area from the administrator home (Priority: P2)

**Goal**: "Usuários" appears in the admin section navigation on the home and every admin page.

**Independent Test**: Sign in as administrator, open `/admin`, reach the user list with the keyboard only; "Usuários" is marked current on list and edit pages (quickstart scenario 1).

- [X] T019 [P] [US3] Add a unit test in `tests/unit/admin-nav.test.ts` rendering `AdminNav` with `react-dom/server` `renderToStaticMarkup` for `current="usuarios"`: a link to `/admin/usuarios` labelled "Usuários" exists and carries `aria-current="page"`; with `current="inicio"` it has no `aria-current`
- [X] T020 [US3] In `src/app/admin/AdminNav.tsx` add `{ key: "usuarios", href: "/admin/usuarios", label: "Usuários" }` after "Hospedagens"
- [X] T021 [US3] Pass `current="usuarios"` to `AdminNav` in `src/app/admin/usuarios/page.tsx` and `src/app/admin/usuarios/[id]/page.tsx` (replacing the temporary value from T009/T012)
- [X] T022 [US3] Check that the nav still fits at 320px with three links in `src/app/admin/admin.module.css` (`.adminNavInner`): allow wrapping or horizontal scrolling inside the nav only, never page-level horizontal scroll

**Checkpoint**: All stories done

---

## Phase 6: Polish & cross-cutting

- [X] T023 [P] Generalise the copy in `src/app/admin/error.tsx` (it says "Não foi possível carregar as reservas") to cover the users pages too, e.g. "Não foi possível carregar esta página" / "O sistema não respondeu. Verifique se a API está no ar e tente de novo."
- [X] T024 [P] Add a "Usuários" entry to `README.md` where the admin routes are listed (if such a list exists), naming the API dependency from `specs/010-admin-user-management/contracts/api-users.md`
- [ ] T025 *(partial: scenario 7 signed-out redirect verified against `next start`; scenarios 1–6 and 8 need a running API with the endpoints in contracts/api-users.md)* Run the quickstart scenarios in `specs/010-admin-user-management/quickstart.md` (1–8) against a local API; record any scenario that cannot run because the API endpoints are missing (scenario 6 must pass regardless)
- [X] T026 Final `npm test && npm run lint && npm run typecheck && npm run build`

---

## Dependencies & execution order

- **Setup (T001–T002)** → **Foundational (T003–T006)** → stories.
- **US1 (T007–T013)** depends only on Foundational.
- **US2 (T014–T018)** depends on US1's action (T010) and form (T011) files existing; it modifies them.
- **US3 (T019–T022)** depends only on Foundational for T019–T020; T021 needs T009 and T012. It can be done before US1 if desired (the link would point at a page not yet built).
- **Polish (T023–T026)** after the stories it touches.

Within stories: tests first (they fail), then implementation, then the check task.

## Parallel opportunities

- Foundational: T003 and T005 together (different files); T006 after both.
- US1: T007 (test), T008 (CSS) and T011 (form) in parallel; then T009, T010, T012.
- US2: T014 in parallel with T016; T015 and T017 after.
- US3: T019 and T020 in parallel.
- Polish: T023 and T024 in parallel.

```text
# Example — US1 kickoff:
T007 tests/unit/admin-users-action.test.ts
T008 src/app/admin/usuarios/users.module.css
T011 src/app/admin/usuarios/[id]/UserEditForm.tsx
```

## Implementation strategy

1. **MVP**: Setup + Foundational + US1 → renaming works; ship behind the "em breve" fallback if the API is not ready.
2. **+US2**: profile changes with confirmation and self-protection.
3. **+US3**: the nav link makes it discoverable (small; can ship with the MVP).
4. Polish and the full quickstart run.

**External dependency**: scenarios 2–5 need the API endpoints in `contracts/api-users.md` (`GET /v1/users`, `GET /v1/users/{id}`, `PUT /v1/users/{id}/name`). Until they ship, only the role endpoint and the "em breve" path can be verified against a real API; unit tests cover the rest with stubbed responses.
