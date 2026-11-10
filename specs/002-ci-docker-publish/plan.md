# Implementation Plan: CI Pipeline with Container Image Publication and Deployment Handoff

**Branch**: `002-ci-docker-publish` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-ci-docker-publish/spec.md`

## Summary

This plan ports the entrePatasETurnosAPI GitHub Actions pipeline to the web site. The pipeline keeps
the API pipeline's structure:

- a publication gate;
- one pass/fail box per stage;
- checksummed hand-offs between jobs;
- one image built without credentials and tagged twice;
- an immutable `sha-` tag;
- a least-privilege deployment dispatch;
- an honest summary.

Each stage is swapped for its web equivalent. Maven tests become lint, type check, and Vitest. The
native executable becomes a Next.js standalone build archive. The UBI image becomes a non-root
`node:22-bookworm-slim` image, which gets a smoke test before it can be published. The feature also adds what
the pipeline needs and the repository lacks: a test suite (proxy and Google sign-in), a `typecheck`
script, `output: "standalone"`, a `Dockerfile`, and a `.dockerignore`.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 LTS. Workflow scripts are written in bash and in
Python 3 (the Python is preinstalled on the runner).

**Primary Dependencies**:

- Next.js 16.4.5 and React 19.3.
- GitHub Actions, pinned by SHA: checkout, setup-node, upload-artifact, download-artifact,
  setup-buildx, build-push, and login.
- Docker Buildx.
- The `gh` CLI and `jq` (both preinstalled on the runner).

**Storage**: N/A. Run artifacts are kept for 1 day.

**Testing**: Vitest 5, with a JUnit reporter writing `reports/junit.xml`. A container smoke test runs
in the image job.

**Target Platform**: GitHub-hosted `ubuntu-latest` runners. The image is linux/amd64.

**Project Type**: Web application (Next.js App Router, backend-for-frontend) plus its CI/CD
workflow.

**Performance Goals**: A pull request run takes under 15 minutes (SC-005). A misconfigured run
fails in under 1 minute (SC-002).

**Constraints**:

- Only `publish` holds registry credentials, and only `deploy` holds the dispatch token.
- No credential is ever printed.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is fixed at build time, while `API_BASE_URL` stays a runtime
  setting.

**Scale/Scope**:

- One workflow file with 7 jobs.
- About 4 new configuration files and about 2 test files.
- Small edits to `package.json` and `next.config.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | How compliance is verified |
|-----------|----------|----------------------------|
| I. Next.js and React, responsive, keyboard-usable | Partly. The stack is unchanged and there is no UI change. | `output: "standalone"` is a Next.js-native option, so the stack does not change. The feature adds no user-facing flow, so there is nothing new to check for responsiveness or keyboard use. |
| II. entrePatasETurnosAPI as the backend | Partly. There are no new API operations. | The image reads `API_BASE_URL` at runtime (container contract I2). The smoke test proves the site starts and serves `/` while the API is unreachable. Tests stub `fetch`, and they assert that an unreachable API makes sign-in return 502 instead of crashing. |
| III. Two sign-in methods, one set of access rules | Yes | CI runs automated tests on every pull request and push (FR-008). Signed-out users: unit tests cover `/painel`, `/admin/**`, and `/app/**`, plus a rejected refresh token, and the image smoke test repeats the `/admin` check in the real container. Google sign-in: the route-handler tests cover success, CSRF rejection, a bad request, an API rejection, and an unreachable API. Password sign-in: see Complexity Tracking. |
| IV. Plans document compliance verification | Yes | This table. |

**Gate result**: PASS, with one justified exception that existed before this feature (below).

**Post-design re-check**: PASS. The Phase 1 artifacts (contracts C4 and C6, and container contract
I3) carry the verifications listed above, so nothing changed.

## Project Structure

### Documentation (this feature)

```text
specs/002-ci-docker-publish/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── ci-pipeline-contract.md
│   ├── container-image-contract.md
│   └── deployment-handoff-contract.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
.github/workflows/ci.yaml        # NEW: the pipeline (contracts/ci-pipeline-contract.md)
Dockerfile                       # NEW: runtime image (contracts/container-image-contract.md)
.dockerignore                    # NEW: everything except site-standalone.tar.gz
.nvmrc                           # NEW: 22
vitest.config.mts                # NEW: jsdom-free node env, @ alias, server-only stub, junit output
next.config.ts                   # EDIT: output: "standalone"
package.json                     # EDIT: scripts typecheck/test, engines.node, devDependencies
.gitignore                       # EDIT: /reports, site-standalone.tar.gz
README.md                        # EDIT: CI section + repository settings table
src/
├── proxy.ts                     # unchanged, under test
├── app/api/auth/google/route.ts # unchanged, under test
└── test/
    └── server-only.ts           # NEW: empty stub aliased for "server-only"
tests/
└── unit/
    ├── proxy.test.ts            # NEW: signed-out redirects, refresh failure, /entrar bounce
    └── google-sign-in.test.ts   # NEW: POST /api/auth/google behaviours
```

**Structure Decision**: The repository stays a single Next.js project. Tests live in a top-level
`tests/unit/`, so they never sit beside routes in `src/app`, where Next could treat them as
segments. CI and container files are at the root, where the tools expect them.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle III requires automated checks for username/password sign-in, but this feature adds none. | Password sign-in does not exist yet: the API does not support it (README, "Not built yet"), so there is nothing to test. This gap predates the constitution and is not introduced here. The pipeline built here is what will run those tests once that feature adds them. | Writing tests for a sign-in method that does not exist would only produce placeholder or skipped tests that prove nothing, while still letting the summary show the check as covered. |
