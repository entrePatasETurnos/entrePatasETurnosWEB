# Research: Registration screen for new users

No unknowns were left in the Technical Context. Each decision below settles a design question the spec
leaves open.

## R1. Who sends `POST /v1/users`

- **Decision**: a Server Action (`registerAction`) on the site's server sends it through
  `apiFetch` (`src/lib/api.ts`). That call already sends a JSON body with
  `Content-Type: application/json` and `Accept: application/json`. In production `API_BASE_URL` is
  `https://api.entrepataseturnos.com`, so the request goes to exactly
  `POST https://api.entrepataseturnos.com/v1/users`.
- **Rationale**: the README and `api.ts` set this rule: the browser never calls the API, and the API has
  no CORS setup for the site. One code path calls the API, and its errors are already parsed into
  `ApiError` with the `error` code.
- **Alternatives considered**: the browser calls the API directly with `fetch`. Rejected: it needs CORS
  on the API, exposes the API host to the client bundle, and breaks the backend-for-frontend rule
  (constitution II). A route handler (`/api/users`) would work but adds a JSON endpoint the site doesn't
  otherwise need. A Server Action gives pending state through `useActionState` at no extra cost.

## R2. Keeping the confirmation in the form only

- **Decision**: the "Confirmar senha" input has **no `name` attribute**, so it is never part of the
  `FormData` the browser sends. The client form compares it with the password in its `onSubmit`
  handler. If they differ, it calls `preventDefault()`, shows the inline error, and nothing is sent.
- **Rationale**: this meets FR-003 by construction. The value never leaves the browser, not even to the
  site's server, so no server code can forward or log it by mistake.
- **Alternatives considered**: send it to the Server Action and drop it there. Rejected: the value would
  leave the form, against the request. **Accepted gap**: if JavaScript hasn't loaded, a native submit
  skips the comparison. The submit button is therefore disabled until the form has hydrated (R4), so
  the check always runs.

## R3. Keeping e-mail, name and CPF after a failure

- **Decision**: the action's failure state returns the submitted `values: { email, name, cpf }`, never
  the password. The inputs render `defaultValue={state.values.x}`. React 19 resets a form after its
  action completes, and the reset restores each field to the new `defaultValue`. Non-password fields
  keep what was typed, and both password fields are cleared (FR-011).
- **Rationale**: inputs stay uncontrolled, as in `BookingActions.tsx`, and the password-clearing rule
  comes from the platform rather than custom code.
- **Alternatives considered**: controlled inputs for every field. That works, but adds state and
  re-renders on each keystroke and still needs explicit password clearing. Rejected as more code for the
  same result.

## R4. Pending state and double submission

- **Decision**: use `const [state, action, pending] = useActionState(registerAction, initial)`. The
  submit button is `disabled={pending || !hydrated}` and reads "Criando conta…" while pending. The form
  sets `aria-busy` while pending. A `useEffect` sets `hydrated` on mount.
- **Rationale**: this is the pattern in Next.js 16's forms guide
  (`node_modules/next/dist/docs/01-app/02-guides/forms.md`, "Pending states") and the one the admin
  buttons use. A disabled button cannot start a second submission, by click or by Enter (SC-004).

## R5. Mapping API answers to messages

The API's registration contract (entrePatasETurnosAPI `RegistrationResource`):

| API answer | Site shows |
|---|---|
| `201` with the created account | Success panel "Conta criada" (FR-007) |
| `400 invalid_request` with `fields: { email?, name?, cpf?, password?, body? }` | Each message under its field. `body` becomes a form-level message. Messages are already in Portuguese. |
| `409 USER_ALREADY_EXISTS` | Form-level message: the API's `message` (e.g. "Usuário já cadastrado; conta vinculada a GOOGLE."), plus a link to `/entrar` (FR-009) |
| `409 CPF_ALREADY_EXISTS` | "CPF já cadastrado." under the CPF field, plus the sign-in link (FR-009) |
| Anything else (5xx, network error, timeout, unparseable body) | "Não foi possível criar a sua conta agora. Tente novamente em instantes." (FR-010) |

- **Rationale**: the API already writes user-facing Portuguese messages for field errors and duplicate
  e-mails. Showing them keeps the rules in one place (constitution II). Unknown failures are logged on
  the server with the status and code only (never the body sent, which holds the password) and are
  shown generically.

## R6. Checks before sending

- **Decision**: one pure function, `validateRegistration(input)` in `src/lib/registration.ts` (no
  `server-only`, so the client can import it). It returns field messages for an empty e-mail, name or
  CPF, and for a password under 8 characters, using the API's own wording. The client form runs it
  together with the confirmation check. The Server Action runs it again, without the confirmation,
  before calling the API.
- **Rationale**: early feedback without a round trip (FR-005), one definition of the rules in both
  places, and unit-testable in the existing Node-only Vitest setup. E-mail format and CPF validity stay
  with the API (spec Assumptions).
- **Alternatives considered**: copy the API's e-mail regex and CPF check digits into the site. Rejected:
  a second copy of business rules that could drift.

## R7. Signed-in visitors and discoverability

- **Decision**: add `/cadastro` to the proxy matcher and treat it like `/entrar`: a visitor with a
  session cookie is sent to `/painel`. `/entrar` gains a line "Não tem conta? Criar conta com e-mail e
  senha" linking to `/cadastro` (FR-013).
- **Rationale**: reuses the existing optimistic cookie check, and the visitor reaches their own area as
  the spec's edge case asks.

## R8. Testing without a DOM

- **Decision**: there's no DOM test environment (Vitest runs in `node`, with no Testing Library). The
  behaviour is unit-tested at these points:
  - `validateRegistration`;
  - `registerAction` with `fetch` stubbed: exact URL, method, content type, and body keys; each error
    mapping; values kept and password absent from the returned state;
  - the proxy redirect for `/cadastro`.

  The confirmation check and the pending button are verified in the browser (quickstart). The decision
  logic for the confirmation check sits in a small pure helper, `confirmationError(password, confirm)`,
  so it is still unit-tested.
- **Alternatives considered**: add jsdom and Testing Library. Rejected for this feature: it adds two dev
  dependencies and a second test environment for one form. Worth considering when the next forms (pet
  registration, booking form) arrive.
