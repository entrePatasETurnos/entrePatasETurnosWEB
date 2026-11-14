# Implementation Plan: Administrator home with every pending request

**Branch**: `006-admin-home` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary

`/admin` becomes a home that answers "what needs me now?": a summary per service, hotel bookings waiting
for approval (soonest check-in first, urgent ones marked), and approved stays waiting to be completed,
all actionable in place. The previous filtered list moves to `/admin/hospedagens`. Baths and training are
shown as "em breve" until the API supports them (API spec 032).

## Technical Context

**Language/Version**: TypeScript 5, Node.js ≥ 22
**Primary Dependencies**: Next.js 16.4 (App Router, Cache Components), React 19.3
**Storage**: none (all data from entrePatasETurnosAPI)
**Testing**: Vitest (unit), plus a browser check against a stand-in API during development
**Target Platform**: the standalone Next.js server in the existing container image
**Project Type**: web application (server-rendered, backend for frontend)
**Constraints**: no new dependencies; tokens never reach the browser
**Scale/Scope**: one new page, one moved page, one shared library module

## Data flow

1. `requireRole("ADMINISTRATOR")` (existing) authorizes the request against the API.
2. In parallel: `GET /v1/accommodation-bookings?status=registered&size=100` and
   `GET /v1/accommodation-bookings?status=approved&size=100`.
3. `src/lib/pendencies.ts` (pure, unit-tested) sorts pending by check-in, marks urgency (< 48 h), keeps
   approved bookings that carry a `complete` link, and builds the summary.
4. Actions reuse the existing Server Actions (`approveAction`, `denyAction`, `completeAction`), whose
   `returnTo` already accepts any `/admin…` path.

Sorting happens in the site, so the result is right whether or not API spec 031 (order by check-in) has
been deployed.

## Constitution Check

| Principle | Applies | How compliance is verified |
|---|---|---|
| I. Next.js and React, responsive, keyboard-usable | Yes | Browser check at 1280 px and 390 px (no horizontal scroll); keyboard pass: Tab reaches every link and button in order, Enter/Space operate them, the deny reason is a labelled textarea. |
| II. API as the backend | Yes | No business rule is re-implemented: actions appear only when the API's links do, approval rules (capacity, self-review) stay in the API. Loading (Suspense skeleton), failure (`error.tsx` with retry, shared by the segment), empty ("tudo em dia") states each verified in the browser check. |
| III. Two sign-in methods, one set of rules | Partly | The home uses the existing server-side role check, identical for any sign-in method. A unit test proves signed-out visitors of `/admin` and `/admin/hospedagens` are sent to `/entrar`. **Existing deviation, not introduced here:** password sign-in does not exist yet because the API has no password sign-in endpoint; recorded below. |
| IV. Plans document verification | Yes | This table. |

## Project Structure

```text
specs/006-admin-home/      spec.md, plan.md, tasks.md
src/lib/pendencies.ts       pure: sort, urgency, to-complete, summary
src/app/admin/page.tsx      the home (new content)
src/app/admin/hospedagens/page.tsx   the full filtered list (moved from /admin)
src/app/admin/AdminNav.tsx  Início | Hospedagens
src/app/admin/PendingCard.tsx
tests/unit/pendencies.test.ts
tests/unit/proxy.test.ts    (+ signed-out /admin/hospedagens)
```

## Complexity Tracking

| Deviation | Why | Resolution |
|---|---|---|
| Principle III: no username/password sign-in | The API has no password sign-in endpoint yet (its CLAUDE.md: "There is still no password sign-in"). | Pre-existing; out of scope here. Tracked for when the API adds it. |
