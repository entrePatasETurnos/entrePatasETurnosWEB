# Data Model: Administrator edits users straight from the user list (011)

The site stores nothing; these are the shapes it reads from the API and keeps in the page.

## Account (API 035 representation, read)

| Field | Type | Notes |
|---|---|---|
| `id` | number | Bound to the row's Server Action on the server, never read from the form |
| `name` | string | Editable. 1–255 characters after trimming |
| `email` | string | Read-only |
| `role` | `"CLIENT"` \| `"ADMINISTRATOR"` | Editable. Labels: Cliente / Administrador |
| `status` | `"ACTIVE"` \| `"PENDING_EMAIL_VERIFICATION"` \| `"DISABLED"` \| other string | Read-only. Labels: Ativo / Aguardando confirmação de e-mail / Desativado; an unknown value is shown as is |
| `_links` | `self`, `edit`, `change-role` | Not used by the site |

010's `createdAt` is removed: the API does not send it.

## Page of accounts (API 036, read)

| Field | Type |
|---|---|
| `items` | Account[] |
| `page.number`, `page.size`, `page.totalItems`, `page.totalPages` | number |
| `_links` | `self`, `first`, `last`, `prev?`, `next?` — not used by the site (R10) |

## List query (the page's own URL)

| Param | Values | Invalid / missing |
|---|---|---|
| `perfil` | `CLIENT`, `ADMINISTRATOR` | ignored → all |
| `situacao` | `ACTIVE`, `PENDING_EMAIL_VERIFICATION`, `DISABLED` | ignored → all |
| `pagina` | integer ≥ 0 | 0 |

Mapped to the API as `role`, `status`, `page`, `size=20`.

## Row edit input (form fields sent to the Server Action)

| Field | Meaning |
|---|---|
| `name` | Typed name (trimmed on read) |
| `role` | Selected role |
| `originalName`, `originalRole` | Values the row was showing when editing started; decide what changed |
| `confirmRole` | `"1"` only when the profile change was confirmed in the row |

PATCH body: `{ name? , role? }` — only the fields that differ from the originals.

## Row edit state (`useActionState`)

```text
idle ──Editar──▶ editing ──Salvar (name invalid)──▶ editing + name error   (no request)
                    │──Salvar (role changed, not confirmed)──▶ confirming
                    │                                         ├─Confirmar──▶ saving
                    │                                         └─Cancelar/Esc──▶ editing
                    │──Salvar (only name changed)──▶ saving
                    │──Salvar (nothing changed)──▶ idle   (no request)
                    └──Cancelar/Esc──▶ idle (values restored)
saving ──200──▶ idle + "Alterações salvas." (row shows API answer)
saving ──error──▶ editing + message (typed values kept)
```

Action result type:

```ts
type UserRowState =
  | { status: "idle" }
  | { status: "unchanged" }
  | { status: "saved"; user: { id: number; name: string; role: UserRole; status: string } }
  | { status: "error"; values: { name: string; role: UserRole };
      fieldErrors: { name?: string }; formError?: string; notFound?: boolean };
```

## List coordination (client, `UserList`)

| State | Meaning |
|---|---|
| `editingId: number \| null` | The one row in edit mode |
| `dirty: boolean` | That row's inputs differ from its saved values |
| `pendingSwitch: number \| null` | Row the administrator tried to open while `dirty`; shows "Descartar alterações?" |
