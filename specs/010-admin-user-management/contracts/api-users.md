# Contract: entrePatasETurnosAPI endpoints used by user management (010)

All endpoints are under the API base URL, use `Authorization: Bearer <access token>`, and are
**administrator-only**: a CLIENT token gets `403 { "error": "forbidden" }`, no token gets `401`.
Error bodies follow the API's existing `ErrorResponse`: `{ "error": "<code>", "message": "<text>"? }`.

## Existing — used as is

### `PUT /v1/users/{id}/role`

Request: `{ "role": "CLIENT" | "ADMINISTRATOR" }`

| Answer | Meaning | Site shows |
|---|---|---|
| `200` role-change record (`commandId`, `targetUserId`, `previousRole`, `newRole`, `occurredAt`, …) | Applied and audited | success |
| `400 invalid_request` | Missing/unknown role | "Perfil inválido." |
| `404 not_found` | No such user | "Usuário não encontrado." + link to list |
| `409 own_role_change_forbidden` *(optional, recommended — see below)* | Caller targeted themselves | "Você não pode alterar o seu próprio perfil." |

### `GET /v1/users/me`

Used only for `id`, to recognise the administrator's own account.

## New — required from the API (dependency)

### `GET /v1/users?q=&page=&size=`

| Param | Rule |
|---|---|
| `q` | Optional. Case-insensitive substring of name **or** e-mail. |
| `page` | 0-based, default 0 |
| `size` | 1–100, default 20 |

Order: name ascending (case-insensitive), then id.

`200`:

```json
{
  "items": [
    {
      "id": 42,
      "name": "Maria da Silva",
      "email": "maria@example.com",
      "role": "CLIENT",
      "status": "ACTIVE",
      "createdAt": "2026-10-02T13:20:00Z",
      "_links": {
        "self":   { "href": "/v1/users/42" },
        "rename": { "href": "/v1/users/42/name", "method": "PUT" },
        "role":   { "href": "/v1/users/42/role", "method": "PUT" }
      }
    }
  ],
  "page": { "number": 0, "size": 20, "totalItems": 1, "totalPages": 1 }
}
```

`404` on the collection itself (endpoint not deployed yet) → the site shows "em breve" (research R2).

### `GET /v1/users/{id}`

`200` one item of the shape above. `404 not_found` for an unknown id.

### `PUT /v1/users/{id}/name`

Request: `{ "name": "Maria da Silva Souza" }`

| Answer | Meaning | Site shows |
|---|---|---|
| `200` the updated user (shape above) | Saved | success |
| `400 invalid_request` with `fields.name` | Blank or > 255 characters after trimming | the message under the name field |
| `404 not_found` | No such user | "Usuário não encontrado." |

The API trims the name and is the authority on its rules; the site checks the same rules first only for
quick feedback.

API-side notes for whoever implements it (not binding on the web):
- Renaming is a request-path write to `users`; the API constitution's bounded-writes principle needs a
  new numbered operation for it.
- Booking answers already carry the owner's *current* name (API spec 033), so a rename shows up there
  without further work.
- Recommended: `PUT /v1/users/{id}/role` refuses `id == caller` with `409 own_role_change_forbidden`.
  The site already blocks it, but the API is the real authority.
