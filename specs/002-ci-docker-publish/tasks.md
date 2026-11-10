---

description: "Task list for CI Pipeline with Container Image Publication and Deployment Handoff"
---

# Tasks: CI Pipeline with Container Image Publication and Deployment Handoff

**Input**: Design documents from `specs/002-ci-docker-publish/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. FR-008 and constitution Principle III require an automated suite, and the
pipeline has nothing to run without one.

**Organization**: Tasks are grouped by user story. `.github/workflows/ci.yaml` is a single file, so
its tasks are sequential (no [P]), and each one adds or edits one job.

**Reference pipeline**: The API pipeline the user pasted into `/speckit-specify` (see the spec's Input
line). When a task says "port from the API", copy that job's steps and comments, then apply only
the listed changes. Keep every comment that still holds, and reword the ones that mention Maven,
the JDK, or native compilation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling the pipeline invokes (research R3, R4)

- [X] T001 Add dev dependencies `vitest@^5`, `@vitejs/plugin-react`, and `vite-tsconfig-paths` by
  running `npm install -D …`, so that `package.json` and `package-lock.json` are updated together.
- [X] T002 Edit `package.json`:
  - add the script `"typecheck": "tsc --noEmit"`;
  - add the script `"test": "vitest run --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml"`;
  - add `"engines": { "node": ">=22" }`.
- [X] T003 [P] Create `.nvmrc` containing `22`.
- [X] T004 [P] Append `/reports` and `/site-standalone.tar.gz` to `.gitignore`.
- [X] T005 [P] Add `output: "standalone"` to the config object in `next.config.ts`. Keep
  `cacheComponents` and `partialPrefetching` as they are.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The test harness and workflow skeleton every story builds on

- [X] T006 [P] Create `src/test/server-only.ts`. It exports nothing and has a one-line comment
  explaining that it replaces the `server-only` package under Vitest.
- [X] T007 Create `vitest.config.mts`:
  - plugins `tsconfigPaths()` and `react()`;
  - `test.environment: "node"` and `test.include: ["tests/**/*.test.ts"]`;
  - `resolve.alias` mapping `server-only` to `./src/test/server-only.ts`;
  - `test.env.API_BASE_URL = "http://api.test"`.

  Depends on T001 and T006.
- [X] T008 Create `.github/workflows/ci.yaml` with only the following, ported from the API with
  changes:
  - Header comment: describe the web stages. Drop note 1 about the suite running twice and replace
    it with: "tests run once; `next build` has no test phase". Keep note 2 about artifacts crossing
    job boundaries. Change the spec reference to `specs/002-ci-docker-publish/`.
  - `name: CI`, the `on` triggers, `permissions: contents: read`, and the `concurrency` block with its
    comment.
  - `env`: `NODE_VERSION: '22'`, `BUILD_ARTIFACT: site-standalone`, `IMAGE_ARTIFACT: container-image`,
    and `LOCAL_IMAGE: local/entrepataseturnos-web`.
  - A `jobs:` key with no jobs yet.

**Checkpoint**: `npx vitest run` exits 0 with "no test files", and the workflow parses.

---

## Phase 3: User Story 1 – Every change is checked before it can merge (Priority: P1) 🎯 MVP

**Goal**: On every pull request and push, the gate, checks, build, and image jobs pass or fail in
their own boxes, without credentials.

**Independent Test**: quickstart.md, scenarios 1–3.

### Tests for User Story 1

- [X] T009 [P] [US1] Create `tests/unit/proxy.test.ts` to test `proxy` from `@/proxy`. Build requests
  with `new NextRequest("http://site.test" + path, { headers: { cookie } })`, using the names from
  `COOKIE` in `@/lib/session`, and stub `fetch` with `vi.stubGlobal`. The cases are:
  - (a) with no cookies, `/painel` returns a 307 redirect to `/entrar` with no `de` parameter;
  - (b) with no cookies, `/admin` redirects to `/entrar?de=%2Fadmin`, and `/admin/reservas?x=1`
    keeps the path and query in `de`;
  - (c) with no cookies, `/app` and `/app/pets` redirect to `/entrar` with `de` set;
  - (d) with `ept_rt` and `ept_sid` but no `ept_at`, when the API refresh returns 401, `/admin`
    redirects to `/entrar` and the response deletes every session cookie;
  - (e) the same as (d) when the refresh returns 200 with a valid `SessionResponse`: the response is
    not a redirect, and it sets `ept_at`;
  - (f) a visitor with `ept_at` on `/entrar` is redirected to `/painel`;
  - (g) a visitor with no cookies on `/entrar` is not redirected.

  Add a comment that these cases are the constitution Principle III check that signed-out users
  cannot reach protected features.
- [X] T010 [P] [US1] Create `tests/unit/google-sign-in.test.ts` to test `POST` from
  `@/app/api/auth/google/route`, with `fetch` stubbed. The cases are:
  - (a) when the API returns 200 with a `SessionResponse`, the handler returns 200 with
    `{ redirectTo: "/painel" }`. It sets `ept_at`, `ept_rt`, `ept_sid`, and `ept_name` as
    `HttpOnly`, and the stub received `POST {API_BASE_URL}/v1/auth/sessions/google` with body
    `{ idToken }`;
  - (b) a request whose `origin` header is a different origin gets 403, and the API is not called;
  - (c) a missing or non-string `idToken`, or a body that is not JSON, gets 400;
  - (d) an API 401 with `{ error: "invalid_token" }` is passed through as 401 with
    `error: "invalid_token"`;
  - (e) when `fetch` rejects (the API is unreachable), the handler returns 502 with
    `api_unreachable`.

  Read `src/lib/api.ts` first, so the stubbed responses match what `apiFetch` parses.
- [X] T011 [US1] Run `npm test`. Confirm that every case passes and that `reports/junit.xml` exists
  with `tests`, `failures`, `errors`, and `skipped` attributes on each `<testsuite>`. If the reporter
  nests suites differently, write down the actual layout for T014. Depends on T007, T009, and T010.

### Implementation for User Story 1

- [X] T012 [P] [US1] Create the `Dockerfile` (container contract, research R6):
  - `FROM node:22-bookworm-slim@sha256:<digest>`; resolve the digest with
    `docker buildx imagetools inspect node:22-bookworm-slim`;
  - `WORKDIR /app`;
  - `ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1`;
  - `ADD --chown=node:node site-standalone.tar.gz /app/`;
  - `USER node` and `EXPOSE 3000`;
  - `HEALTHCHECK` running
    `node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"`;
  - `CMD ["node","server.js"]`.

  Add comments explaining:
  - why `HOSTNAME` is set;
  - that `API_BASE_URL` is runtime-only;
  - that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is already embedded in the build.
- [X] T013 [P] [US1] Create `.dockerignore` containing `*` followed by `!site-standalone.tar.gz`, with
  a comment explaining that the build output arrives prebuilt.
- [X] T014 [US1] Add the `gate` job to `.github/workflows/ci.yaml`. Port the API's "Decide whether this
  run publishes" step unchanged, with its outputs and comments. Do NOT add the configuration check
  yet; T018 adds it.
- [X] T015 [US1] Add the `checks` job (box name "Checks", `needs: gate`, `timeout-minutes: 15`, output
  `verdict`) to `.github/workflows/ci.yaml`. Its steps:
  - checkout, pinned at `3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`;
  - `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` with
    `node-version: ${{ env.NODE_VERSION }}` and `cache: npm`. Add a comment that it caches
    `~/.npm` keyed on the lockfile, never `node_modules/` or `.next/`;
  - separate steps "Install dependencies" (`npm ci`), "Lint" (`npm run lint`), "Type check"
    (`npm run typecheck`), and "Run the test suite" (`npm test`);
  - "Report the test outcome", with `if: always()`: the API's Python parser, reading
    `reports/junit.xml` instead of the surefire glob and summing over `<testsuite>` elements, whether
    the root element is `<testsuites>` or `<testsuite>` (use T011's findings).
- [X] T016 [US1] Add the `build` job (box name "Production build", `needs: checks`,
  `timeout-minutes: 15`, outputs `summary` and `sha256`) to `.github/workflows/ci.yaml`. Its steps:
  - checkout, setup-node with npm cache, and `npm ci`;
  - "Build the site": run `npm run build` with env `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set to
    `${{ vars.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'ci-placeholder.apps.googleusercontent.com' }}`. Add a
    comment that the value is public and embedded at build time, that the gate enforces the real
    value on publishing runs, and that pull requests use the placeholder;
  - "Assemble and verify the build output" (`set -euo pipefail`, research R2): copy `.next/static`
    into `.next/standalone/.next/static`, and copy `public` if it exists. Fail with `::error::` if
    any of the following holds:
    - `.next/standalone/server.js` is missing;
    - `.next/standalone/.next/static` is empty;
    - `.next/standalone/node_modules/next` is missing;
    - `find .next/standalone -name '.env*'` finds anything.

    Then run `tar -C .next/standalone -czf site-standalone.tar.gz .`, and check that
    `tar -tzf … | grep -qx './server.js'`. Write
    `summary=built — site-standalone.tar.gz, <du -h>` and `sha256=<sha256sum>` to `$GITHUB_OUTPUT`;
  - upload-artifact (v7.0.1 pin) with name `${{ env.BUILD_ARTIFACT }}`, path
    `site-standalone.tar.gz`, `if-no-files-found: error`, and `retention-days: 1`.
- [X] T017 [US1] Add the `image` job (box name "Container image", `needs: build`,
  `timeout-minutes: 15`, output `sha256`) to `.github/workflows/ci.yaml`. Its steps:
  - checkout;
  - download-artifact (v8.0.1 pin) to `.`;
  - "Verify the build output is the one this run built": compare the SHA-256 of
    `site-standalone.tar.gz` with `needs.build.outputs.sha256`, passed through `env`;
  - setup-buildx (v4.3.0 pin);
  - build-push (v7.3.0 pin) with `context: .`, `file: Dockerfile`, `platforms: linux/amd64`,
    `push: false`, `tags: ${{ env.LOCAL_IMAGE }}:${{ github.sha }}`, and
    `outputs: type=docker,dest=/tmp/image.tar`. Keep the API's comment about building once without
    credentials;
  - "Smoke-test the image" (contract C6.3). It runs `docker load -i /tmp/image.tar`, then
    `docker run -d --name smoke -p 3000:3000 -e API_BASE_URL=http://127.0.0.1:9` with the image,
    then a `trap 'docker logs smoke || true; docker rm -f smoke' EXIT`. It then:
    - polls `curl -fsS -o /dev/null http://127.0.0.1:3000/` for up to 30 seconds;
    - asserts that `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://127.0.0.1:3000/admin`
      returns 307 with a URL ending in `/entrar?de=%2Fadmin`;
    - asserts that `docker exec smoke id -u` is not `0`.

    Each failure uses `::error::`;
  - "Checksum the image";
  - "Hand the image to the publish job". Port these last two from the API unchanged.

**Checkpoint**: A pull request shows four green boxes, and no step references secrets. Validate with
quickstart scenarios 1–3.

---

## Phase 4: User Story 2 – Merges to main publish a container image (Priority: P2)

**Goal**: A push to `main` publishes `sha-<commit>` and `latest` from the one image this run built.
Misconfiguration fails fast.

**Independent Test**: quickstart.md, scenarios 4–6.

- [X] T018 [US2] Add the step "Check the publishing configuration" to the `gate` job in
  `.github/workflows/ci.yaml`, ported from the API. Keep all six of the API's checks and add
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` as `repository variable NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Extend the
  comment: an image built without the real client id ships a broken sign-in button.
- [X] T019 [US2] Add the `publish` job (box name "Docker Hub") to `.github/workflows/ci.yaml`, ported
  from the API unchanged: the same pins, the checksum verification, the login, the immutable-tag
  logic, and the outputs `digest`, `tags`, `image`, and `revision_tag`. The only edit is to the
  immutability comment. Keep the reasoning, but replace "the native build is not reproducible" with
  "builds are not byte-reproducible", and drop the API-specific incident date.

**Checkpoint**: Quickstart scenarios 4–6 pass on `main`.

---

## Phase 5: User Story 3 – Published images are handed to the deployment (Priority: P3)

**Goal**: After publication, the deployment workflow is requested with the five inputs.

**Independent Test**: quickstart.md, scenario 5 (the deployment part).

- [X] T020 [US3] Add the `deploy` job (box name "Deployment handoff") to `.github/workflows/ci.yaml`,
  ported from the API, with `permissions: {}`, the same `if`, and the same outputs. Make these edits:
  - change the re-enable loop to only `"$DEPLOY_WORKFLOW"`, with this comment: "the web deployment
    has no watchdog; re-enabling a workflow that does not exist would warn on every run";
  - change the spec references to `specs/002-ci-docker-publish/contracts/deployment-handoff-contract.md`,
    and the 422 message's section reference to `H3`.

  Keep the retry logic, the separate stdout and stderr streams, the status messages, and the
  never-use-`set -x` comment unchanged.

**Checkpoint**: With a consumer workflow in place (deployment-handoff contract H3), a merge requests
exactly one deployment.

---

## Phase 6: User Story 4 – One honest summary per run (Priority: P3)

**Goal**: Every run ends with a table that never claims more than the run proved.

**Independent Test**: Make the build fail (for example, add a type error). The summary then shows
Checks with counts and Production build as FAILED, and the Container image, Publication, and
Deployment rows read "not reached".

- [X] T021 [US4] Add the `summary` job (`needs: [gate, checks, build, image, publish, deploy]`,
  `if: always()`) to `.github/workflows/ci.yaml`, ported from the API, with these changes:
  - rename the env `TEST_*` to `CHECKS_*` (from `needs.checks`), `NATIVE_*` to `BUILD_*` (from
    `needs.build.outputs.summary`), and `IMAGE_RESULT` to come from `needs.image`;
  - name the rows "Checks", "Production build", "Container image", "Publication", and "Deployment";
  - keep every wording rule and comment about never claiming "published" or "requested".

**Checkpoint**: The summary is correct on a pull request, on a failing run, and on a publishing run.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T022 [P] Add a "Continuous integration" section to `README.md`, after "Scripts". It covers:
  - the seven stages in one line each;
  - a table of the seven repository settings (name, kind, example), linking to
    `specs/002-ci-docker-publish/data-model.md`;
  - a note that the deployment repository needs its own web workflow declaring the five inputs, and
    must not reuse `cd.yaml`.

  Also add `npm run typecheck` and `npm test` to the Scripts block.
- [X] T023 Validate `.github/workflows/ci.yaml` with
  `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest -color`, and fix every finding.
  The checks include shellcheck on the `run:` blocks.
- [X] T024 Run quickstart.md scenarios 1 and 2 locally, and confirm the expected outputs: 200 on `/`,
  a 307 redirect from `/admin` to `/entrar?de=%2Fadmin`, and a non-zero uid.
- [X] T025 Verify that no job other than `publish` reads `secrets.DOCKERHUB_*` and no job other than
  `deploy` reads `secrets.DEPLOY_DISPATCH_TOKEN`; the gate's presence check is the one allowed
  exception. Check with `grep -n 'secrets\.' .github/workflows/ci.yaml`.

---

## Dependencies & Execution Order

- **Setup (T001–T005)**: Start immediately. T002 depends on T001, because both edit `package.json`.
- **Foundational (T006–T008)**: T007 depends on T001 and T006. T008 is independent.
- **US1 (T009–T017)**: Depends on Phase 2.
  - T009, T010, T012, and T013 can run in parallel.
  - T011 comes after T009 and T010.
  - T014 → T015 → T016 → T017 are sequential, because they edit the same file.
  - T016 also needs T005 (the standalone output), and T017 needs T012 and T013.
- **US2 (T018–T019)**: Depends on US1, because publish consumes the image artifact and T018 extends
  the gate.
- **US3 (T020)**: Depends on US2, because deploy consumes publish's outputs.
- **US4 (T021)**: Depends on every job existing, because it reads all of their `needs`.
- **Polish**: After US4. T022 can run any time after T008.

```text
Setup → Foundational → US1 (MVP) → US2 → US3 → US4 → Polish
```

## Parallel Example: User Story 1

```text
T009 tests/unit/proxy.test.ts
T010 tests/unit/google-sign-in.test.ts
T012 Dockerfile
T013 .dockerignore
```

Then `T011` (run the suite), then T014 → T017 in order, in `ci.yaml`.

## Implementation Strategy

- **MVP = Phase 1 + 2 + US1**: pull requests are fully checked, built, and containerised, with no
  credentials needed. Merge this first; the gate already reports "skipped" on pull requests.
- **Increment 2 = US2**: create the four Docker Hub and Google settings (`DOCKERHUB_IMAGE`,
  `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) before merging.
- **Increment 3 = US3**: before merging, create the web workflow in the deployment repository and
  the `DEPLOY_*` settings. The gate requires all seven settings once T018 lands. So if US3 ships
  later than US2, set the `DEPLOY_*` settings before US2 is merged, or the gate fails.
- **Increment 4 = US4**: the summary. It can land together with US1 if preferred, as long as it only
  `needs` the jobs that exist at that point.
