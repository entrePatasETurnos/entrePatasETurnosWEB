# Quickstart: validate administrator user management (010)

## Prerequisites

- entrePatasETurnosAPI running locally with the three endpoints from
  [contracts/api-users.md](contracts/api-users.md) (`GET /v1/users`, `GET /v1/users/{id}`,
  `PUT /v1/users/{id}/name`). Without them, only scenario 6 can be checked.
- `.env.local` with `API_BASE_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (see `.env.example`).
- Two accounts: **A** (ADMINISTRATOR) and **B** (CLIENT, with at least one hotel booking).

```bash
npm run dev          # http://localhost:3000
npm test             # unit tests, including tests/unit/admin-users*.test.ts
npm run lint && npm run typecheck
```

## Scenarios

1. **Link on the home** — sign in as A, open `/admin`. "Usuários" is in the section navigation; Tab to it
   and press Enter → `/admin/usuarios`, with "Usuários" marked as current.
2. **Search** — type part of B's e-mail → only matching users. Search for `zzzz` → the empty state.
   Pagination keeps the search.
3. **Rename** — open B, change the name, Salvar → "Alterações salvas." The list and B's booking card on
   `/admin/hospedagens` show the new name. Clear the name → inline error, nothing saved.
4. **Profile with confirmation** — open B, choose Administrador, Salvar → confirmation panel takes focus;
   Esc cancels; Salvar again, Confirmar → saved. In another browser as B, reload → B lands on `/admin`.
   Change B back to Cliente → B's next page load goes to `/app`.
5. **Self-protection** — open A's own row ("(você)"): profile radios disabled with the note. A crafted
   POST with `role=CLIENT&confirmRole=1` for A is refused with "Você não pode alterar o seu próprio
   perfil." Renaming A updates the header name immediately.
6. **API without the endpoints** — against an API that lacks `GET /v1/users`: `/admin/usuarios` shows
   "estará disponível em breve", no error page.
7. **Access** — as B (signed in with Google *and*, separately, with e-mail and password), open
   `/admin/usuarios` → sent to `/app`. Signed out → sent to `/entrar`.
8. **Mobile & keyboard** — at 375 px width, repeat 2–4 using only the keyboard; no horizontal scroll.
