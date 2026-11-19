# Quickstart: validating 011 (inline user editing)

## Prerequisites

- entrePatasETurnosAPI running with specs 035 and 036 deployed (`GET /v1/users`, `PATCH /v1/users/{id}`).
- `.env.local` with `API_BASE_URL` pointing at it; `npm install`.
- Accounts: administrator A (Google sign-in), administrator B (e-mail/password), a client C, ≥ 21 accounts
  in total (to get two pages), at least one pending and one disabled account.

## Automated checks

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass, including `tests/unit/admin-users.test.ts` (list query mapping, PATCH body) and
`tests/unit/admin-users-action.test.ts` (row action: refusals, unchanged, self, confirmation, error
mapping, `refresh` on success).

## Manual scenarios (`npm run dev`)

1. **List** — As A, open the admin home → "Usuários". Skeleton, then rows with name, e-mail, profile, status
   (pending/disabled shown). A's row says "(você)" with no "Editar". "Página 1 de 2"; page 2 shows the rest,
   no repeats. (US1, SC-002)
2. **Rename** — "Editar" on C, change the name with extra spaces around it, "Salvar". Row shows the
   trimmed name and "Alterações salvas."; reload keeps it; a booking of C shows the new name. (US2, SC-005)
3. **Validation** — Clear the name, "Salvar": inline "Informe o nome completo.", no request in the network
   panel. 256 characters cannot be typed (maxLength). (US2.3)
4. **Cancel** — Edit C, change both fields, press `Esc`: row back to saved values, focus on "Editar". (US2.4)
5. **Profile** — Edit C, choose Administrador, "Salvar": confirmation names C. "Cancelar" sends nothing.
   Repeat and "Confirmar": badge Administrador. C's next page load reaches `/admin`. Demote back. (US3)
6. **Both at once** — Change name and profile, confirm: both saved. Stop the API, repeat: error shown,
   values kept, nothing changed after the API returns and the list reloads. (FR-007, FR-009)
7. **One row at a time** — Edit C, type a change, press "Editar" on another row: "Descartar alterações em …?"
   both answers behave as described. (Edge case)
8. **Filters** — Perfil = Administrador: only A and B; page links keep the filter; "Limpar filtros" resets.
   `?perfil=XYZ` shows everyone. `?pagina=99`: "Esta página não existe." (US4)
9. **Access** — As C, open `/admin/usuarios`: sent to the client area. Signed out: sent to `/entrar`.
   `/admin/usuarios/7` as A: lands on the list. (SC-003)
10. **Both sign-ins** — Repeat 2 as B (password sign-in). (Principle III)
11. **Keyboard + phone** — At 375 px wide, using only Tab/Shift+Tab/Enter/Space/Esc/arrow keys, do 2, 5 and 8.
    No horizontal scroll. (SC-006, Principle I)
