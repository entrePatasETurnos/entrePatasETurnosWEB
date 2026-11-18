# Data Model: Administrator user management (010)

The site stores nothing. These are the shapes it reads from and sends to entrePatasETurnosAPI (see
[contracts/api-users.md](contracts/api-users.md)) and the form state it keeps in the browser.

## UserSummary (read from the API)

| Field | Type | Notes |
|---|---|---|
| `id` | number | Account id |
| `name` | string | Editable here |
| `email` | string | Read-only |
| `role` | `"CLIENT"` \| `"ADMINISTRATOR"` | Editable here (not for one's own account) |
| `status` | `"ACTIVE"` \| `"PENDING_EMAIL_VERIFICATION"` \| `"DISABLED"` \| string | Read-only; unknown values shown as-is |
| `createdAt` | ISO-8601 string | Shown as "cliente desde" |
| `_links` | `{ self, rename?, role? }` | Optional; when present, the UI shows an action only if its link is present (same rule as bookings) |

On screen:

| Value | Label |
|---|---|
| `CLIENT` | Cliente |
| `ADMINISTRATOR` | Administrador |
| `ACTIVE` | Ativo |
| `PENDING_EMAIL_VERIFICATION` | Aguardando confirmação de e-mail |
| `DISABLED` | Desativado |

## UserPage (read from the API)

`{ items: UserSummary[], page: { number, size, totalItems, totalPages } }` — the same envelope as
`BookingPage`.

## EditUser form (browser → Server Action)

| Field | Sent | Rule |
|---|---|---|
| `name` | yes | Trimmed; required; ≤ 255 characters |
| `role` | yes | Exactly `CLIENT` or `ADMINISTRATOR`; ignored for one's own account |
| `originalName` | hidden | What was loaded, to detect a change |
| `originalRole` | hidden | What was loaded, to detect a change |
| `confirmRole` | hidden, `1` only after the confirmation step | A role change without it is not applied |

The target id is bound into the action on the server (`saveUserAction.bind(null, id)`), never read from
the form.

## EditUser state (Server Action → form)

```text
idle
error   { values: { name, role }, fieldErrors: { name? }, formError?, saved?: { name } }
```

On full success the action redirects (`?aviso=salvo`), so there is no "success" state in the form.
`saved.name` is set when the rename succeeded but the role change did not (R6), so the form shows the
new name as the original from then on.

## Validation rules (from the spec)

- Name: `trim()`, then required and `length ≤ 255` (FR-006).
- Role: one of the two values (FR-007).
- Self: role change refused when `id === me.id` (FR-009).
- No change: neither field differs from its original → "Nada para salvar." without calling the API.
- Search text (`busca`): trimmed, at most 100 characters; empty means "all users".
- Page (`pagina`): integer ≥ 0, defaults to 0.

## State transitions

Profile: `CLIENT ⇄ ADMINISTRATOR`, applied by the API and recorded in its role-change audit trail
(FR-015). No other transitions are made by this feature.
