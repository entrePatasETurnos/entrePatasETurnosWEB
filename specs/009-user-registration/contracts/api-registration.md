# Contract: user registration in entrePatasETurnosAPI

What the site sends and what it expects back. Source: entrePatasETurnosAPI
`identity/registration/RegistrationResource.java` and its DTOs. The site changes nothing in the API.

## Request

```http
POST https://api.entrepataseturnos.com/v1/users
Content-Type: application/json
Accept: application/json

{"email":"voce@email.com","name":"Maria da Silva","cpf":"123.456.789-09","password":"uma-senha-longa"}
```

- Sent by the site's server (`registerAction` → `registerUser` → `apiFetch`), with no `Authorization`
  header. The endpoint is `@PermitAll`.
- The base URL comes from `API_BASE_URL`, which production sets to `https://api.entrepataseturnos.com`.
- The body has exactly these four string keys. The password is sent unchanged.

## Responses

| Status | Body | Site behaviour |
|---|---|---|
| `201 Created` | `{ id, email, name, status: "PENDING_EMAIL_VERIFICATION", role: "CLIENT", emailVerifiedAt: null, createdAt, updatedAt, _links: { self } }` | success panel |
| `400 Bad Request` | `{ error: "invalid_request", message, fields: { email?, name?, cpf?, password?, body? } }` | field messages; `body` becomes the form-level message |
| `409 Conflict` | `{ error: "USER_ALREADY_EXISTS", message }` | form-level message = `message`, plus sign-in link |
| `409 Conflict` | `{ error: "CPF_ALREADY_EXISTS", message: "CPF já cadastrado." }` | CPF field message, plus sign-in link |
| `500` / other | `{ error: "internal_error", message: null }` or no body | general retry message |
| network error / timeout | none | general retry message |

## Verified by

`tests/unit/registration.test.ts` stubs `fetch` and asserts:
- the URL (`${API_BASE_URL}/v1/users`), method, `Content-Type`;
- the exact set of keys in the body;
- each row of the table above.
