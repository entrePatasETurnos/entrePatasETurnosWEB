# Contract: the registration screen (`/cadastro`)

## Route

| Path | Who | Behaviour |
|---|---|---|
| `/cadastro` | signed out | Shows the form |
| `/cadastro` | has a session cookie | The proxy redirects to `/painel` (same as `/entrar`) |
| `/entrar` | signed out | Gains the link "Não tem conta? Criar conta com e-mail e senha" → `/cadastro` |

## Fields, in tab order

| Label | `name` | Type / attributes | Notes |
|---|---|---|---|
| E-mail | `email` | `type="email"`, `autocomplete="email"`, `required` | kept after failure |
| Nome completo | `name` | `type="text"`, `autocomplete="name"`, `required` | kept after failure |
| CPF | `cpf` | `type="text"`, `inputmode="numeric"`, `required` | kept after failure; dots and dash allowed |
| Senha | `password` | `type="password"`, `autocomplete="new-password"`, `minlength=8`, `required` | cleared after any submit attempt reaches the server |
| Confirmar senha | *(none)* | `type="password"`, `autocomplete="new-password"`, `required` | never sent; mismatch error shown directly below it |
| Criar conta | — | `type="submit"` | disabled until hydrated and while pending; text "Criando conta…" while pending |

## Messages

- Each field error is a `<p id="<field>-error">` directly under its input. The input gets
  `aria-invalid="true"` and `aria-describedby="<field>-error"`. When an attempt is blocked, focus moves
  to the first invalid field.
- Mismatch: "As senhas não conferem." under "Confirmar senha".
- The form-level message sits above the button with `role="alert"`. On a duplicate e-mail or CPF it
  includes the link "Entrar" → `/entrar`.

## Success panel (replaces the form)

- Heading "Conta criada" (the spec's "Account created"). It receives focus when shown.
- Text: "Enviamos um link de confirmação para <email>. Confirme o seu e-mail para poder entrar."
- Link "Ir para o login" → `/entrar`.

## Layout

The page reuses the `/entrar` layout (side panel plus main panel), so it works at 390 px and 1280 px
without horizontal scrolling.
