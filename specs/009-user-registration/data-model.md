# Data Model: Registration screen for new users

The site stores nothing. These are the shapes that pass through the form, the Server Action and the API.

## RegistrationRequest (sent to the API)

Exactly the API's `RegistrationRequest`. Field names and types are preserved (spec FR-002).

| Field | Type | Source | Rule checked on the site | Rule checked by the API |
|---|---|---|---|---|
| `email` | string | input `name="email"`, trimmed | not empty | not empty, `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` |
| `name` | string | input `name="name"`, trimmed | not empty | not empty |
| `cpf` | string | input `name="cpf"`, trimmed, sent as typed | not empty | valid CPF; dots and dash accepted |
| `password` | string | input `name="password"`, **not trimmed** | length ≥ 8 | length ≥ 8 |

No other key is sent. In particular, there's no confirmation and no `role` or `status`.

## Password confirmation (form only)

An input with no `name`, so it never appears in `FormData`. Rule: `confirm === password`, exact
comparison with no trimming. If they differ: "As senhas não conferem." under the field, and the
submission is cancelled.

## RegistrationState (what the Server Action returns to the form)

```ts
type RegistrationValues = { email: string; name: string; cpf: string };

type RegistrationState =
  | { status: "idle" }
  | { status: "created"; email: string }
  | {
      status: "error";
      values: RegistrationValues;               // never the password
      fieldErrors: Partial<Record<"email" | "name" | "cpf" | "password", string>>;
      formError?: string;                       // shown above the button, role="alert"
      offerSignIn?: boolean;                    // duplicate e-mail or CPF
    };
```

### State transitions

```text
idle | error ──submit, valid──────────────► pending
idle | error ──submit, invalid or mismatch─► same state + inline errors (nothing sent)
pending ──201─────────────────────────────► created  (form replaced by the success panel; final)
pending ──4xx / 5xx / network / timeout───► error    (e-mail, name, CPF kept; passwords cleared)
```

## RegisteredUser (API `201` body, read only to confirm success)

`id`, `email`, `name`, `status` (`PENDING_EMAIL_VERIFICATION`), `role` (`CLIENT`), `emailVerifiedAt`
(null), `createdAt`, `updatedAt`, `_links.self`. The site uses only `email`, to say where the
confirmation e-mail went.

## Registration errors (API `4xx` bodies)

- Field errors: `{ "error": "invalid_request", "message": "...", "fields": { "<field>": "<pt-BR message>" } }`
- Conflicts: `{ "error": "USER_ALREADY_EXISTS" | "CPF_ALREADY_EXISTS", "message": "<pt-BR message>" }`
- Anything else: `{ "error": "<code>", "message": null }`, or no body.
