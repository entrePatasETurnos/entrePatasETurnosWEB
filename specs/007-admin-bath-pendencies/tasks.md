# Tasks: Baths on the administrator home (007)

All done on branch `007-admin-bath-pendencies`, stacked on `006-admin-home`.

- [x] T001 `src/lib/baths.ts`: list (404 → `null`, anything else thrown), approve, deny, complete against `/v1/bath-appointments` (API spec 032)
- [x] T002 `src/lib/pendencies.ts`: `Entry`, `pendingAcross`, `toCompleteAcross`, `entryKey`, one ordering for stays and baths
- [x] T003 `src/lib/format.ts`: `formatTime`
- [x] T004 `src/app/admin/actions.ts`: every action takes a service; approve-all takes `{service, id}` targets and reports partial success
- [x] T005 `BookingActions`, `ApproveAll`, `notices.ts`: service-aware wording and labels ("Aprovar o banho de X")
- [x] T006 `BathCard.tsx`, `BookingCard` `showService`, `.badgeService`
- [x] T007 `src/app/admin/page.tsx`: merged lists, bath summary card, "em breve" fallback (FR-005), soon panel only for what is missing
- [x] T008 Unit tests: `tests/unit/pendencies.test.ts` (merged order, urgency, to-complete), `tests/unit/baths.test.ts` (404 → null; 401/403/500/503 thrown)
- [x] T009 README routes and "Not built yet"
- [x] T010 Verification: lint, typecheck, 45 unit tests, production build; browser check against a stand-in API at 1280 px and 390 px, keyboard-only approval, full-hour refusal, deny, complete, approve-all across both services (2 of 4, refusals kept), and the same page against an API without bath routes ("Em breve")
