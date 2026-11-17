# Quickstart: validating the registration screen

## Prerequisites

- API running locally: `./db.sh && ./mvnw quarkus:dev` in entrePatasETurnosAPI (`http://localhost:8080`).
- `.env.local` with `API_BASE_URL=http://localhost:8080`.
- `npm install`, then `npm run dev`. The site is at <http://localhost:3000>.

## Automated checks

```bash
npm run lint && npm run typecheck && npm test
```

Expected: everything is green, including `tests/unit/registration.test.ts` and the new `/cadastro` case
in `tests/unit/proxy.test.ts`. See [contracts/api-registration.md](./contracts/api-registration.md) for
what the registration test asserts.

## Browser scenarios (signed out, DevTools Network tab open)

Generate a valid test CPF with any CPF generator for test data.

| # | Do | Expect |
|---|---|---|
| 1 | Open `/entrar` and follow "Criar conta com e-mail e senha" | `/cadastro` opens |
| 2 | Fill every field validly, type the same password twice, submit | One `POST /cadastro` (the Server Action). The button reads "Criando conta…" and is disabled until the answer arrives. "Conta criada" appears with the e-mail and an "Ir para o login" link to `/entrar`. In the API log, one account registered. |
| 3 | Fill the form, then type a different confirmation and submit | No network request. "As senhas não conferem." appears under "Confirmar senha". Fix it and submit: the request is sent. |
| 4 | Inspect the request payload from scenario 2 | It contains `email`, `name`, `cpf`, `password` and no confirmation value |
| 5 | Repeat scenario 2 with the same e-mail | "Usuário já cadastrado…" with an "Entrar" link. E-mail, name and CPF are still filled; both passwords are empty. Change the e-mail and CPF, retype the passwords, and the submit succeeds. |
| 6 | Use a new e-mail but the CPF from scenario 2 | "CPF já cadastrado." under CPF, with the other fields kept |
| 7 | Type an invalid CPF (e.g. `111.111.111-11`) | The API's "CPF inválido…" appears under CPF |
| 8 | Use a 5-character password | "A senha deve ter ao menos 8 caracteres." under Senha, with no request sent |
| 9 | Stop the API and submit valid data | "Não foi possível criar a sua conta agora…". The button is enabled again and the fields are kept. |
| 10 | Double-click "Criar conta" quickly | Only one request is sent |
| 11 | Sign in with Google, then open `/cadastro` | Redirected to `/painel` |
| 12 | Repeat 2 and 3 using only the keyboard, at 390 px and at 1280 px | Everything is reachable with Tab; errors are read out; no horizontal scroll |
