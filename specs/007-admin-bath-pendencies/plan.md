# Implementation Plan: Pending baths on the administrator home

**Branch**: `007-admin-bath-pendencies` (stacked on `006-admin-home`) | **Date**: 2026-11-14 |
**Spec**: [spec.md](./spec.md)

## Summary

A server-only `src/lib/baths.ts` reads and acts on `/v1/bath-appointments`, answering "unavailable" when
the API has no such endpoint (`404`), so the site can ship first. `src/lib/pendencies.ts` gains pure
functions that merge stays and baths into one list ordered by start, and one "to complete" list. The
home renders a `BathCard` beside `BookingCard`; the existing Server Actions take a `service` argument and
call the right endpoints.

## Technical Context

**Language/Version**: TypeScript 5, Node.js ≥ 22 · **Dependencies**: Next.js 16.4, React 19.3 (no new ones)
· **Testing**: Vitest; browser check against a stand-in API, with and without bath endpoints

## Constitution Check

| Principle | Applies | How compliance is verified |
|---|---|---|
| I. Responsive, keyboard | Yes | Browser check at 1280 px and 390 px (no horizontal scroll); approve a bath by keyboard only. |
| II. API as backend | Yes | Bath rules (hour taken, self-review, when completion is allowed) stay in the API: buttons follow its links, refusals are its error codes. Loading, failure and empty states reuse spec 006's, checked in the browser. Unit test: a `404` bath list means "unavailable", any other error is a failure. |
| III. Access rules | Yes | Every bath action re-checks the administrator role on the server (`requireRole`), as stays do. Pre-existing deviation unchanged: no password sign-in (the API lacks it). |
| IV. Plans document verification | Yes | This table. |

## Project Structure

```text
src/lib/baths.ts                 server-only API calls; null when the API has no baths
src/lib/pendencies.ts            + pendingAcross, toCompleteAcross (pure)
src/lib/format.ts                + formatTime
src/app/admin/BathCard.tsx       a bath item
src/app/admin/actions.ts         service-aware approve/deny/complete/approve-all
src/app/admin/BookingActions.tsx + service prop
src/app/admin/ApproveAll.tsx     items carry their service
src/app/admin/page.tsx           merged list, bath summary, "Em breve" fallback
tests/unit/pendencies.test.ts    + merged ordering
tests/unit/baths.test.ts         404 → unavailable; other errors thrown
```
