# Research: Tutor name and API nights on the administrator home

## R1. Missing fields from an older API

**Decision**: declare `ownerName?: string` and `nights?: number` as optional on `Booking`. The helpers
treat anything other than a non-empty string, or a whole number ≥ 0, as missing.

**Rationale**:
- The site and the API deploy independently. `ownerName` (API spec 033) is in production. `nights`
  (API spec 034, PR #30) is merged and deploying.
- Typing the fields as optional makes the compiler force the fallback paths (spec FR-003, FR-005).
- Checking the value at runtime guards against `null` or a wrong type, because `apiFetch` casts and does not
  validate.

**Alternatives considered**:
- Required fields: these would lie about older answers, and the card would print "undefined".
- Falling back to `nightsBetween` when `nights` is missing: this contradicts FR-004/FR-005 and
  Principle II, since the site would again hold the rule.

## R2. How the tutor is written

**Decision**: "Ana Souza · Tutor nº 7". Without a name, "Tutor nº 7", as today. The name and the number
are separate text nodes inside the existing `.owner` line, after the user icon.

**Rationale**: name first is how people read a list. The number stays because names are not unique (spec
Edge Cases). The "·" separator matches the card's other line ("Hospedagem · 11 noites · 2 pets").

**Alternatives considered**: name alone (ambiguous for homonyms); "Tutor: Ana Souza (nº 7)" (longer on a
phone).

## R3. Testing without rendering components

**Decision**: put the card's two decisions in pure functions in `src/lib/format.ts` and unit-test them in
`tests/unit/format.test.ts`. Check the rendered card in the browser (quickstart).

**Rationale**:
- Vitest runs in Node and includes `*.test.ts` only.
- The cards import CSS modules and `"use client"` children, so rendering them would need a DOM
  environment and new test dependencies.
- The project already tests decisions this way (`pendencies.ts`, `baths.ts`).

**Alternatives considered**: adding jsdom and Testing Library for one card. That is a new dependency and
configuration for two strings.

## R4. Long names on narrow screens

**Decision**:
- `.owner` becomes `display: flex; flex-wrap: wrap; min-width: 0`.
- The name span gets `overflow-wrap: anywhere`.
- The number span gets `white-space: nowrap`, so "Tutor nº 7" never breaks.

**Rationale**: `.who` already has `min-width: 0` and flexes to 220 px. Letting the name wrap keeps the
whole line inside the card, and it doesn't need truncation, which would hide part of the name.

**Alternatives considered**: ellipsis truncation, which hides part of the name; administrators asked to see
it.

## R5. What stays computing nights

**Decision**:
- `nightsBetween` stays in `format.ts`, used only by the customer area (`src/app/app/page.tsx`).
- Its Javadoc-style comment gains a note that the administrator cards read the API's `nights` (spec 008),
  and that the customer area will follow.

**Rationale**: the spec keeps the customer area out of scope. Deleting the helper now would break that
page.

## R6. Stale comment

**Decision**: remove "The API sends only the owner's id, never a name or e-mail (privacy by design)" from
`BookingCard.tsx`. Replace it with a comment saying the name comes from API spec 033's `ownerName` and the
number stays because names repeat.

**Rationale**: since API spec 033 the comment is false, and it would mislead the next reader.
