# Contract: the "Usuários" list with inline editing (011)

Replaces the list and edit screens of `specs/010-admin-user-management/contracts/ui-users.md`.
Navigation (the "Usuários" entry in `AdminNav`) is unchanged. Administrator-only, Portuguese copy,
usable at 320 px with no horizontal scroll, every control reachable and operable by keyboard.

## `/admin/usuarios`

- Title "Usuários"; intro "Corrija o nome ou mude o perfil de qualquer pessoa direto na lista."
- **Filters** (GET form, `role="search"` not used — it is a filter): `<select name="perfil">` "Perfil"
  (Todos / Cliente / Administrador) and `<select name="situacao">` "Situação" (Todas / Ativo /
  Aguardando confirmação de e-mail / Desativado), button "Filtrar". When any filter is set: link
  "Limpar filtros" to `/admin/usuarios`.
- **Rows** (`<ul>`, one `<li>` per account), view mode:
  - name (own row: "(você)"), e-mail, profile badge, status (shown only when not Ativo);
  - button "Editar" with accessible name "Editar <nome>". Absent on the own row, which shows instead
    "Este é você. Peça a outro administrador para alterar seus dados."
- **Row, edit mode** (a `<form>` replacing the row's content; `aria-busy` while saving):
  - "Nome completo": text input, `maxLength=255`, `autoComplete="off"`, pre-filled, focused on open.
  - "Perfil": `<fieldset>` with radios "Cliente" / "Administrador".
  - Buttons "Salvar" (label "Salvando…" and disabled while pending) and "Cancelar". `Esc` anywhere in the
    row = "Cancelar". Closing returns focus to the row's "Editar" button.
  - Only one row in edit mode. Pressing "Editar" on another row while this one has unsaved changes shows,
    in this row, "Descartar alterações em <nome>?" with "Descartar" (closes this row, opens the other) and
    "Continuar editando" (focus back to this row's name input).
- **Profile confirmation** (selected profile differs from the saved one, on "Salvar"): an in-row panel
  (`role="group"`, `tabIndex=-1`, focused): "Tornar **<nome>** <Administrador | Cliente>?" plus
  "Administradores veem e aprovam todos os pedidos." / "Deixará de acessar o painel do administrador.";
  "Confirmar" (submits with `confirmRole=1`) and "Cancelar" (focus back to "Salvar"); `Esc` = "Cancelar".
  When the name also changed, the same confirmation sends both.
- **Results**:
  - success → view mode with the saved values and an in-row status message "Alterações salvas."
    (`role="status"`), focus on the row's "Editar" button;
  - nothing changed → back to view mode, no request, no message;
  - name error → under the input (`aria-invalid`, `aria-describedby`), input focused;
  - other error → in-row `role="alert"` box (focused), typed values kept; for "Usuário não encontrado." a
    link "Recarregar lista".
- **Paging**: "← Anteriores" / "Página N de M" / "Próximas →", keeping `perfil` and `situacao`.
- **Empty**: no filters → "Nenhum usuário cadastrado."; with filters → "Nenhum usuário com esses filtros."
  + "Limpar filtros"; past the last page → "Esta página não existe." + "Voltar à primeira página".
- **Loading**: skeleton rows inside `<Suspense>`, `aria-busy="true"`.
- **Load failure**: the existing admin `error.tsx` boundary with retry.

## `/admin/usuarios/{id}`

Redirects to `/admin/usuarios` (after the administrator check), so old links keep working.
