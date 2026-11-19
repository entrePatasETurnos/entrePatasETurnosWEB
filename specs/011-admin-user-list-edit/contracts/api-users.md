# Contract: entrePatasETurnosAPI endpoints used by the user list (011)

Source of truth: API `specs/036-admin-user-list/contracts/rest-api.md` and
`specs/035-admin-edit-account/contracts/rest-api.md`. This file records only what the site relies on.
All calls go through `src/lib/api.ts` (`apiFetch`, server-only) with `Authorization: Bearer <access token>`.

## `GET /v1/users?role=&status=&page=&size=`

Called by `listUsers(token, { role?, status?, page, size: 20 })`. Only valid filter values are sent
(the site drops unknown ones first, research R3).

`200`:

```json
{
  "items": [
    { "id": 7, "name": "Álvaro Lima", "email": "alvaro@example.com", "role": "CLIENT", "status": "ACTIVE",
      "_links": { "self": {…}, "edit": {…}, "change-role": {…} } }
  ],
  "page": { "number": 0, "size": 20, "totalItems": 5, "totalPages": 1 },
  "_links": { "self": {…}, "first": {…}, "last": {…} }
}
```

- Order is the API's (Portuguese alphabetical by name, then id); the site does not re-sort.
- Empty result or page past the last: `200` with `items: []`.

| Refusal | Site behaviour |
|---|---|
| `400` | Not expected (filters pre-validated); thrown → admin `error.tsx` |
| `401` / `403` | Not expected after `requireRole`; thrown → admin `error.tsx` |
| any other | thrown → admin `error.tsx` with retry |

## `PATCH /v1/users/{id}`

Called by `editUser(token, id, { name?, role? })` from `saveUserRowAction`. Body contains only the fields
that changed; never both absent (the action returns `unchanged` before calling).

```json
{ "name": "Ana Silva", "role": "ADMINISTRATOR" }
```

`200`: the Account after the change (shape of an item above, plus `role-change` link when `role` was
sent). Both fields are applied or neither.

| Refusal | Site shows (research R6) |
|---|---|
| `400` `fields.name` | the message under the name input |
| `400` `fields.role` | "Perfil inválido." |
| `400` other | "Não foi possível salvar. Confira os dados." |
| `401` | "Sua sessão expirou. Entre novamente." |
| `403` (non-administrator, or own account) | "Você não tem permissão para fazer isso." |
| `404` `not_found` | "Usuário não encontrado." + reload link |

## `GET /v1/users/me`

Unchanged from 010: `getMyId(token)` → `id`, to mark and lock the administrator's own row.

## No longer used

`GET /v1/users?q=` (search never existed), `GET /v1/users/{id}`, `PUT /v1/users/{id}/name` (never existed),
`PUT /v1/users/{id}/role` (replaced by PATCH).
