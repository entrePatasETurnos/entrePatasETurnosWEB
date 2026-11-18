# Contract: user management screens (010)

All screens: administrator-only (`requireRole("ADMINISTRATOR")`; the proxy's `/admin/:path*` matcher
already sends signed-out visitors to `/entrar`), Portuguese copy, usable at phone width with no
horizontal scroll, every control reachable and operable by keyboard.

## Navigation (`src/app/admin/AdminNav.tsx`)

`LINKS` gains `{ key: "usuarios", href: "/admin/usuarios", label: "Usuários" }`, after "Hospedagens".
It appears on the administrator home and every admin page; `aria-current="page"` on both
`/admin/usuarios` and `/admin/usuarios/{id}`.

## `/admin/usuarios` — list

- Title "Usuários"; intro "Encontre uma pessoa para corrigir o nome ou mudar o perfil."
- Search: a GET form, `<label>` "Buscar por nome ou e-mail", input `name="busca"` (type `search`), button
  "Buscar". When `busca` is set: a "Limpar busca" link to `/admin/usuarios`.
- Each row (a link to `/admin/usuarios/{id}`): name, e-mail, profile badge (Cliente / Administrador),
  status (shown only when not Ativo). The administrator's own row says "(você)".
- Pagination: "← Anteriores" / "Página N de M" / "Próximas →", keeping `busca`.
- Empty: "Nenhum usuário encontrado para “<busca>”." or, with no search, "Nenhum usuário cadastrado."
- Loading: skeleton rows inside `<Suspense>`, `aria-busy="true"`.
- API without the endpoint (404 on the collection): "Gerenciar usuários estará disponível em breve."
- Other failures: the admin `error.tsx` boundary (existing), with retry.

## `/admin/usuarios/{id}` — edit

- Back link "← Usuários" (to the list).
- Heading: the user's name. Read-only facts: e-mail, status, "Cliente desde <data>".
- Form:
  - "Nome completo": text input, `name="name"`, `maxLength=255`, `autoComplete="off"`, required.
  - "Perfil": a `<fieldset>` with two radio buttons, "Cliente" and "Administrador".
    - For the administrator's own account: both disabled, with the note "Você não pode alterar o seu
      próprio perfil. Peça a outro administrador." (`aria-describedby`).
  - "Salvar" (disabled while pending, label "Salvando…").
- Confirmation step (only when the selected profile differs from the saved one): pressing "Salvar"
  shows, in place, a plain panel (not a modal dialog) with `tabIndex=-1` that receives focus:
  "Tornar **<nome>** <Administrador | Cliente>?" with an explanation of what changes
  ("Administradores veem e aprovam todos os pedidos." / "Deixará de acessar o painel do administrador."),
  and the buttons "Confirmar" (submits with `confirmRole=1`) and "Cancelar" (hides the panel and returns
  focus to "Salvar"). `Esc` acts as "Cancelar".
- Errors: name errors under the field (`aria-invalid`, `aria-describedby`), focused; other errors in a
  `role="alert"` box above the button, focused. Typed values kept.
- Success: redirect to the same page with `?aviso=salvo` → notice "Alterações salvas." (existing
  `Notice` component).
- Unknown id: "Usuário não encontrado." with a link back to the list (status 404 via `notFound()`).
- Partial success (research R6): "Nome salvo. O perfil não foi alterado: <motivo>."
- Nothing changed: "Nada para salvar."
