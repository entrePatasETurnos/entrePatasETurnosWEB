# Quickstart: Tutor name and API nights on the administrator home

## 1. Automated

```shell
npm run lint
npx tsc --noEmit
npm test                       # includes tests/unit/format.test.ts (data-model.md § Derived display values)
npm run build
grep -n "nightsBetween" src/app/admin/BookingCard.tsx   # expect no output (spec FR-004)
```

Expected: all pass, and the grep prints nothing.

## 2. In the browser, against a local API

Prerequisites: the API repo on `main` (with specs 033 and 034), `./db.sh && ./mvnw quarkus:dev`; this repo
with `.env.local` from `.env.example`; `npm run dev`; sign in with an administrator account.

1. As a client (another browser profile), book a stay from 10:30 on one day to 07:30 eleven days later.
   As the administrator, open <http://localhost:3000/admin>. Expected: the card shows the client's name,
   then "Tutor nº N", and "Hospedagem · 11 noites · 1 pet".
2. Open `/admin/hospedagens`. Expected: the same card shows the same name and nights.
3. In the API's database (`./db.sh psql`), rename the client:
   `update users set name = 'Novo Nome' where id = N;`. Reload `/admin`. Expected: "Novo Nome".
4. Set a 60-character name the same way. Check the card at 1280 px and at 390 px.
   Expected: the name wraps, "Tutor nº N" stays whole, the actions stay on the card, and the page doesn't
   scroll sideways.
5. A pending bath in the same list still shows "Tutor nº N" only (spec FR-006).
6. Point `API_BASE_URL` at an API older than spec 034 (for example, the production image before PR #30),
   or at one older than 033. Expected:
   - without `nights`, the card shows "Hospedagem · 1 pet", with no number of nights and no error;
   - without `ownerName`, the card shows "Tutor nº N" only.
