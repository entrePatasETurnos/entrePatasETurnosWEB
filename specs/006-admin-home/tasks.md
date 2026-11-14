# Tasks: Administrator home with every pending request

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

## Phase 1: Foundation

- [x] T001 Pure pendency logic in `src/lib/pendencies.ts`: sort by check-in, urgency (< 48 h),
  to-complete filter, summary counts
- [x] T002 [P] Unit tests in `tests/unit/pendencies.test.ts`

## Phase 2: User Story 1 (P1), approve and deny from the home

- [x] T003 [US1] Move the filtered list to `src/app/admin/hospedagens/page.tsx`; update its links and
  `returnTo` to `/admin/hospedagens`
- [x] T004 [US1] Home `src/app/admin/page.tsx`: summary, pending list (earliest check-in first, urgent
  mark), loading skeleton, "tudo em dia" empty state, capped-at-100 note
- [x] T005 [US1] `PendingCard` reusing `BookingActions` (approve / deny with reason)

## Phase 3: User Story 2 (P2), stays to complete

- [x] T006 [US2] "Para concluir" group from approved bookings that carry a `complete` link

## Phase 4: User Stories 3-4 (P3)

- [x] T007 [US3] Bath and training summaries shown as "em breve"
- [x] T008 [US4] `AdminNav` (Início | Hospedagens) on both admin pages

## Phase 5: Verification (Constitution Check)

- [x] T009 Unit test: signed-out `/admin/hospedagens` goes to `/entrar` (`tests/unit/proxy.test.ts`)
- [x] T010 lint, typecheck, tests, production build
- [x] T011 Browser check against a stand-in API: desktop, 390 px, keyboard-only pass, loading, empty and
  error states, approve, deny, complete, capacity refusal
