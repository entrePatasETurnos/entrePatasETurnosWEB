# Tasks: Registration screen for new users

**Input**: Design documents from `/specs/009-user-registration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-registration.md,
contracts/ui-registration.md, quickstart.md

**Tests**: Requested by the plan (Constitution Check II and III) and by `contracts/api-registration.md`
§ Verified by. They are Vitest unit tests in the Node environment with `fetch` stubbed, as in
`tests/unit/google-sign-in.test.ts`, followed by browser checks from quickstart.md. No DOM test
environment is added (research R8).

**Organization**: by user story.
- US1 (create an account, P1) is the MVP.
- US2 (password mismatch, P1) adds the confirmation check to US1's form.
- US3 (recover from failure, P2) adds error mapping to US1's action and form.

US2 and US3 touch different parts of the same two files, so implement them one after the other.

Paths are relative to the repository root. The API's contract is in
`specs/009-user-registration/contracts/api-registration.md`; the screen's in
`specs/009-user-registration/contracts/ui-registration.md`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Create branch `009-user-registration` from an up-to-date `main` (after spec 008 merges), and
  confirm `npm test`, `npm run lint` and `npm run typecheck` pass before any change. No dependency is
  added (plan, Technical Context).

---

## Phase 2: Foundational (blocks every story)

- [X] T002 [P] Create `src/lib/registration.ts`. It is client-safe: **no** `import "server-only"`,
  because `RegistrationForm.tsx` imports it.
  - **Constant**: `export const PASSWORD_MIN_LENGTH = 8;`.
  - **Types**, exactly as in `data-model.md` § RegistrationState:
    - `RegistrationRequest = { email: string; name: string; cpf: string; password: string }`;
    - `RegistrationValues = { email: string; name: string; cpf: string }`;
    - `RegistrationField = "email" | "name" | "cpf" | "password"`;
    - `FieldErrors = Partial<Record<RegistrationField, string>>`;
    - `RegistrationState`, a union of:
      - `{ status: "idle" }`;
      - `{ status: "created"; email: string }`;
      - `{ status: "error"; values: RegistrationValues; fieldErrors: FieldErrors; formError?: string; offerSignIn?: boolean }`.
  - **`export const INITIAL_REGISTRATION_STATE: RegistrationState = { status: "idle" };`**
  - **`export function readRegistration(formData: FormData): RegistrationRequest`**:
    - read `email`, `name` and `cpf` with `String(formData.get(x) ?? "").trim()`;
    - read `password` with `String(formData.get("password") ?? "")` and **do not trim it**;
    - read nothing else.
  - **`export function validateRegistration(input: RegistrationRequest): FieldErrors`**, using the API's
    own wording:
    - `email` empty → "Informe o seu e-mail.";
    - `name` empty → "Informe o seu nome completo.";
    - `cpf` empty → "Informe o seu CPF.";
    - `password.length < PASSWORD_MIN_LENGTH` → "A senha deve ter ao menos 8 caracteres.";
    - an empty object when everything passes.

    Do not validate e-mail format or CPF digits (research R6).
- [X] T003 [P] Create `src/lib/users.ts` with `import "server-only";` and
  `export async function registerUser(request: RegistrationRequest): Promise<RegisteredUser>`.
  - It calls `apiFetch<RegisteredUser>("/v1/users", { method: "POST", body: request })` from
    `src/lib/api.ts`. That already sets `Content-Type: application/json` and serializes the body; send no
    token.
  - Build the body explicitly as `{ email, name, cpf, password }`, so no extra key can ever be sent.
  - Export the type `RegisteredUser` with the fields in `data-model.md` § RegisteredUser (`_links` typed
    loosely as `Record<string, unknown>`).
  - Add a doc comment naming API `RegistrationResource` and spec 009.
- [X] T004 [P] Create `tests/unit/registration.test.ts`.
  - Add a header comment naming spec 009 and `contracts/api-registration.md`.
  - Use `afterEach(() => vi.unstubAllGlobals())` and a `json(status, body)` helper copied from
    `tests/unit/google-sign-in.test.ts`.
  - Add `describe("validateRegistration")` covering each rule in T002: empty fields, a 7-character
    password fails, an 8-character password passes, a password of spaces only (8 spaces) passes because
    it is not trimmed, and all-valid input returns `{}`.
  - Add `describe("readRegistration")`: trims e-mail, name and CPF; keeps leading and trailing spaces in
    the password; ignores any other `FormData` key (e.g. `confirm`, `role`).

**Checkpoint**: `npm test` passes, and `npm run typecheck` passes.

---

## Phase 3: User Story 1 - Create an account with a password (Priority: P1) 🎯 MVP

**Goal**: a signed-out visitor fills `/cadastro`, submits, and sees "Conta criada" with a link to
`/entrar`. The submit button is disabled while the request is pending.

**Independent Test**: the `registerAction` success tests in `tests/unit/registration.test.ts` pass.
In the browser, quickstart scenarios 1, 2, 4 and 10.

- [X] T005 [US1] In `tests/unit/registration.test.ts`, add `describe("registerAction")`, importing
  `registerAction` from `@/app/cadastro/actions`. Stub `fetch` with `vi.stubGlobal("fetch", vi.fn(...))`
  returning `json(201, { id: 1, email: "maria@example.com", name: "Maria", status: "PENDING_EMAIL_VERIFICATION", role: "CLIENT", emailVerifiedAt: null, createdAt: "2026-11-16T12:00:00Z", updatedAt: "2026-11-16T12:00:00Z", _links: { self: { href: "/v1/users/1/registration" } } })`.

  Build the `FormData` with `email`, `name`, `cpf`, `password` and an extra `confirm` key. Assert:
  - the URL is `http://api.test/v1/users`;
  - the method is `POST`;
  - the `Content-Type` header is `application/json`;
  - there is no `Authorization` header;
  - `Object.keys(JSON.parse(body)).sort()` equals `["cpf", "email", "name", "password"]`;
  - the password arrives exactly as typed, including surrounding spaces;
  - the returned state is `{ status: "created", email: "maria@example.com" }`.

  Also: invalid input (e.g. a short password) returns `status: "error"` with a `password` field error and
  **does not call `fetch`**. Confirm these fail before T006.
- [X] T006 [US1] Create `src/app/cadastro/actions.ts`, starting with `"use server";`, with
  `export async function registerAction(_prev: RegistrationState, formData: FormData): Promise<RegistrationState>`.
  1. `const input = readRegistration(formData)`, and `values = { email, name, cpf }`.
  2. `const fieldErrors = validateRegistration(input)`. If it is not empty, return
     `{ status: "error", values, fieldErrors }` without calling the API.
  3. `const user = await registerUser(input)`, then return `{ status: "created", email: user.email ?? input.email }`.
  4. For now, wrap step 3 in `try/catch`. On any error, return
     `{ status: "error", values, fieldErrors: {}, formError: "Não foi possível criar a sua conta agora. Tente novamente em instantes." }`
     (US3 refines this in T014).

  Never put the password in the returned state. Never log `formData`, `input` or the error body.
  Add a doc comment explaining that the confirmation field is deliberately absent from the `FormData`
  (research R2).
- [X] T007 [P] [US1] Create `src/app/cadastro/cadastro.module.css` with the form styles, using the CSS
  variables already used in `src/app/entrar/entrar.module.css`:
  - `.form`: a column with a 16 px gap;
  - `.field`: label, input, and error stacked;
  - `.input`: min-height 44 px, full width, visible `:focus-visible` outline;
  - `.input[aria-invalid="true"]`: a red border;
  - `.fieldError`: red, 14 px;
  - `.formError`: a block with a border;
  - `.submit`: full width, min-height 48 px, with a `:disabled` style showing reduced opacity and
    `cursor: not-allowed`;
  - `.success`: the success panel.

  Make sure nothing exceeds the panel width at 390 px.
- [X] T008 [US1] Create `src/app/cadastro/RegistrationForm.tsx`, starting with `"use client"`, exporting
  `RegistrationForm()`.
  - **State**: `const [state, action, pending] = useActionState(registerAction, INITIAL_REGISTRATION_STATE)`.
  - **Hydration**: `const [hydrated, setHydrated] = useState(false); useEffect(() => setHydrated(true), [])`.
  - **Success**: when `state.status === "created"`, render the success panel from
    `contracts/ui-registration.md` § Success panel instead of the form:
    - `<h2 tabIndex={-1}>Conta criada</h2>`, focused on mount through a ref and `useEffect`;
    - the text "Enviamos um link de confirmação para {state.email}. Confirme o seu e-mail para poder entrar.";
    - `<Link href="/entrar">Ir para o login</Link>`.
  - **Form**: otherwise render `<form action={action} noValidate aria-busy={pending}>`.
    - Fields in the order and with the attributes in `contracts/ui-registration.md` § Fields: E-mail
      (`name="email"`), Nome completo (`name="name"`), CPF (`name="cpf"`), Senha (`name="password"`), and
      Confirmar senha with **no `name` attribute** (`id="confirm"`).
    - Each `<label htmlFor>` matches its input's `id`.
    - E-mail, name and CPF take `defaultValue` from `state.status === "error" ? state.values.x : ""`.
    - Password inputs get no `defaultValue`.
  - **Submit button**: `<button type="submit" disabled={pending || !hydrated}>{pending ? "Criando conta…" : "Criar conta"}</button>`.
  - Styles come from `cadastro.module.css`.
- [X] T009 [US1] Create `src/app/cadastro/page.tsx`.
  - Export `metadata: Metadata = { title: "Criar conta" }`.
  - Copy the two-column layout of `src/app/entrar/page.tsx` (import `styles` from
    `../entrar/entrar.module.css` for the layout classes):
    - side panel with the back link, the paw mark, "Entre Patas e Turnos" and the place line;
    - side heading "Crie a sua conta.";
    - side text "Cadastre-se com e-mail e senha para agendar e acompanhar o seu cão.".
  - The main panel has `<h2>Criar conta</h2>`, a one-line explanation, then `<RegistrationForm />`, then
    the help line "Já tem conta? <Link href="/entrar">Entrar</Link>".
- [X] T010 [US1] Run `npm test` and `npm run typecheck` (T005 now passes). With the API running locally,
  run quickstart scenarios 2, 4 and 10.

**Checkpoint**: MVP. A new account can be created from `/cadastro`.

---

## Phase 4: User Story 2 - Catch a mistyped password before sending (Priority: P1)

**Goal**: when password and confirmation differ, nothing is sent and "As senhas não conferem." appears
directly under "Confirmar senha".

**Independent Test**: the `confirmationError` tests pass. Quickstart scenario 3 shows no network request.

- [X] T011 [US2] In `tests/unit/registration.test.ts`, add `describe("confirmationError")`:
  - `("abcdefgh", "abcdefgh")` → `null`;
  - `("abcdefgh", "abcdefgH")` → `"As senhas não conferem."`;
  - `("abcdefgh ", "abcdefgh")` → the message (no trimming);
  - `("abcdefgh", "")` → `"Confirme a sua senha."`.

  Confirm they fail before T012.
- [X] T012 [US2] In `src/lib/registration.ts`, add
  `export function confirmationError(password: string, confirm: string): string | null`:
  - empty `confirm` → "Confirme a sua senha.";
  - `confirm !== password` (exact comparison) → "As senhas não conferem.";
  - otherwise `null`.
- [X] T013 [US2] In `src/app/cadastro/RegistrationForm.tsx`, add client-side checking:
  - **State**: `const [clientErrors, setClientErrors] = useState<FieldErrors & { confirm?: string }>({})`.
  - **`onSubmit` handler** on the `<form>`:
    1. Read the form with `new FormData(event.currentTarget)` and the confirmation from a ref on the
       `#confirm` input.
    2. Compute `validateRegistration(readRegistration(fd))` plus `confirm: confirmationError(password, confirmValue)`.
    3. If anything fails: call `event.preventDefault()`, set `clientErrors`, and focus the first invalid
       field in tab order (email → name → cpf → password → confirm).
    4. Otherwise clear `clientErrors` and let the action run.
    5. Also `preventDefault()` when `pending` is true (FR-006).
  - **Rendering**: each field's error is `clientErrors[f] ?? (state.status === "error" ? state.fieldErrors[f] : undefined)`.
    - Show it in `<p id="{field}-error" className={styles.fieldError}>` directly under the input.
    - Set `aria-invalid` and `aria-describedby` on the input when present.
    - The confirmation error goes in `<p id="confirm-error">` directly under "Confirmar senha".
  - **Clearing**: typing in "Confirmar senha" (`onChange`) clears `clientErrors.confirm`.

**Checkpoint**: quickstart scenario 3 passes, and scenario 2 still passes.

---

## Phase 5: User Story 3 - Recover from a failed registration (Priority: P2)

**Goal**: every failure shows a clear message, keeps e-mail, name and CPF, clears both passwords, and
re-enables the button.

**Independent Test**: the `registerAction` failure tests pass. In the browser, quickstart scenarios 5–9.

- [X] T014 [US3] In `tests/unit/registration.test.ts`, inside `describe("registerAction")`, add one test
  per row of `contracts/api-registration.md` § Responses.
  - **Setup**: submit `FormData` with e-mail " maria@example.com ", name "Maria", CPF "123.456.789-09",
    password "segredo-longo".
  - **In every failure test, assert**:
    - `state.status === "error"`;
    - `state.values` equals `{ email: "maria@example.com", name: "Maria", cpf: "123.456.789-09" }`;
    - `JSON.stringify(state)` does not contain `"segredo-longo"`.
  - **Per row**:
    - `400 { error: "invalid_request", fields: { cpf: "CPF inválido. Confira os números digitados.", email: "E-mail inválido. Exemplo: voce@email.com" } }`
      → `fieldErrors.cpf` and `fieldErrors.email` hold those exact texts.
    - `400 { error: "invalid_request", fields: { body: "Informe os dados de cadastro." } }` →
      `formError` is that text.
    - `409 { error: "USER_ALREADY_EXISTS", message: "Usuário já cadastrado; conta vinculada a GOOGLE." }`
      → `formError` is that message and `offerSignIn === true`.
    - `409 { error: "USER_ALREADY_EXISTS", message: null }` → `formError === "Usuário já cadastrado."`
      and `offerSignIn === true`.
    - `409 { error: "CPF_ALREADY_EXISTS", message: "CPF já cadastrado." }` →
      `fieldErrors.cpf === "CPF já cadastrado."` and `offerSignIn === true`.
    - `500 { error: "internal_error", message: null }` → `formError` is the general message.
    - `fetch` rejecting with `new TypeError("fetch failed")` → `formError` is the general message.
    - `200` with a non-JSON body → the general message.

  Confirm the specific mappings fail before T015.
- [X] T015 [US3] In `src/app/cadastro/actions.ts`, replace the catch block from T006 with a
  `failureState(error, values)` helper implementing `research.md` § R5.
  - **`ApiError` with status 400 and `body.fields` an object**:
    - copy the `email`, `name`, `cpf` and `password` string entries into `fieldErrors`;
    - map `fields.body` (or, failing that, `body.message` when there are no field entries) to `formError`.
  - **Status 409**:
    - `code === "USER_ALREADY_EXISTS"` → `formError` is the body's `message` when it is a non-empty
      string, else "Usuário já cadastrado."; set `offerSignIn: true`;
    - `code === "CPF_ALREADY_EXISTS"` → `fieldErrors.cpf` is the body's `message` or "CPF já cadastrado.";
      set `offerSignIn: true`.
  - **Anything else** (other `ApiError`, `TypeError`, `SyntaxError`): log with
    `console.error("registration failed", status, code)` only, never the error body or the request,
    and return the general message
    "Não foi possível criar a sua conta agora. Tente novamente em instantes.".

  A `201` whose body is not an object counts as a failure, so check `typeof user === "object"` in step 3.
- [X] T016 [US3] In `src/app/cadastro/RegistrationForm.tsx`, render the server failure.
  - **Form-level message**: when `state.status === "error" && state.formError`, render
    `<div role="alert" className={styles.formError}>` above the submit button with the text. When
    `state.offerSignIn` is set, add " <Link href="/entrar">Entrar</Link>".
  - **CPF conflict**: when there is no `formError` but `offerSignIn` is set, render the alert with
    "Já existe uma conta com esses dados. <Link href="/entrar">Entrar</Link>".
  - **Clearing client errors**: clear `clientErrors` whenever `state` changes (`useEffect` on `state`),
    so the server's field messages show.
  - **Focus**: after an error state arrives, move focus to the first field with a server error, or to
    the alert when there is none.
  - **Retry**: confirm that e-mail, name and CPF keep their values (from `defaultValue`, research R3) and
    both password inputs are empty after the failure. If React's form reset does not reapply the new
    `defaultValue`s, add `key={JSON.stringify(state.status === "error" ? state.values : null)}` plus a
    submit counter returned in the state to the `<form>`, forcing a remount with the kept values.

**Checkpoint**: quickstart scenarios 5–9 pass, and US1 and US2 still pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] In `src/proxy.ts`:
  - add `"/cadastro"` to `config.matcher`;
  - extend the signed-in check to `(pathname === "/entrar" || pathname === "/cadastro") && (access || (refresh && sessionId))`,
    redirecting to `/painel`;
  - update the header comment to mention the registration page.
- [X] T018 [P] In `tests/unit/proxy.test.ts`, add two cases: `/cadastro` with an access cookie redirects
  to `/painel`, and `/cadastro` with no cookies is not redirected (`NextResponse.next()`, no `location`
  header).
- [X] T019 [P] In `src/app/entrar/page.tsx`, under `<GoogleSignIn />` and before the help line, add
  `<p className={styles.help}>Não tem conta? <Link href="/cadastro">Criar conta com e-mail e senha</Link></p>`
  (FR-013).
- [X] T020 [P] In `README.md`:
  - add the row `| /cadastro | signed out | Registration with e-mail and password (POST /v1/users); the account must confirm its e-mail before it can sign in |`
    to the Routes table;
  - in "Not built yet", change the password-login bullet to say registration exists (spec 009) but
    sign-in with a password does not yet.
- [X] T021 Run `npm run lint`, `npm run typecheck` and `npm test`; all must pass.
- [ ] T022 Run every browser scenario in `specs/009-user-registration/quickstart.md` (1–12), including
  keyboard-only use at 390 px and 1280 px. Then mark the spec's **Status** as Implemented in
  `specs/009-user-registration/spec.md`.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T004)**: all three are `[P]`, since they are different files. They block every
  story.
- **US1 (T005–T010)**:
  - T005 → T006;
  - T007 can run beside T005 and T006;
  - T008 needs T006 and T007; T009 needs T008; T010 comes last.
- **US2 (T011–T013)** needs US1's form (T008): T011 → T012 → T013.
- **US3 (T014–T016)** needs US1's action and form (T006, T008), and runs after US2 because both edit
  `RegistrationForm.tsx`: T014 → T015 → T016.
- **Polish**:
  - T017–T020 are independent of the stories and of each other (`[P]`); they can start any time after
    T001;
  - T021 and T022 come last.

## Parallel Example

```text
After T001:            T002, T003, T004 together
                       plus T017, T018, T019, T020 (different files from everything else)
Inside US1:            T005 and T007 together
```

## Implementation Strategy

1. **MVP**: Setup, Foundational, US1. Accounts can be created; the confirmation field exists but is not
   checked yet.
2. **US2**: the confirmation check. This is required before release, because the request makes it
   mandatory.
3. **US3**: precise failure messages and a smooth retry.
4. **Polish**: the redirect for signed-in visitors, the link from `/entrar`, the README, and the full
   quickstart run.

Ship after step 3 at the earliest. US2 is part of the original request, so the MVP alone should not be
released.
