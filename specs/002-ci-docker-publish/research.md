# Research: CI Pipeline with Container Image Publication and Deployment Handoff

All Technical Context unknowns are resolved below. Sources: the bundled Next.js 16 docs in
`node_modules/next/dist/docs/`, the existing code in `src/`, the API pipeline the user supplied, and
`entrePatasETurnos/deployEntrePatasETurnos/.github/workflows/cd.yaml` (read through the GitHub API).

## R1. What replaces the native executable

- **Decision**: `output: "standalone"` in `next.config.ts`. The build job runs `npm run build`, copies
  `.next/static` into `.next/standalone/.next/static` (and `public/` if it ever exists), and archives
  `.next/standalone` as one `site-standalone.tar.gz`. That tarball is the hand-off, checksummed like
  the executable.
- **Rationale**: `docs/01-app/03-api-reference/05-config/01-next-config-js/output.md` says standalone
  "copies only the necessary files for a production deployment", including the traced
  `node_modules`, and produces a `server.js` that can run without `next start`. It is the closest
  equivalent of a self-contained executable: the image needs Node and nothing else. Static assets
  are not copied automatically, so the build job copies them. Packing them into a tarball keeps file
  modes and gives a single checksum.
- **Alternatives considered**: (a) Build inside the Dockerfile in a multi-stage build. This is
  simpler, but the build stage would have no box of its own, and the image could contain a build
  different from the one the checks validated. (b) Upload `.next/` plus `node_modules`. This is
  large, includes dev dependencies, and violates FR-014.

## R2. Verifying the build output (equivalent of "exactly one ELF x86-64 runner")

- **Decision**: The build job fails unless all of the following hold:
  - `.next/standalone/server.js` exists;
  - `.next/standalone/.next/static` exists and contains files;
  - `.next/standalone/node_modules/next` exists;
  - no file named `.env*` exists under `.next/standalone`.
  After packing, the archive must list `server.js` at its root. The output records the size and the
  SHA-256.
- **Rationale**: Each check matches one way the image could start but fail. Without `server.js`
  there is nothing to run. Without static files, pages render unstyled and without JavaScript.
  Without traced dependencies, the server crashes at startup. A `.env` file would bake local secrets
  into the image (FR-014).
- **Alternatives considered**: Booting the server in the build job and requesting `/`. Rejected
  here because the image job's smoke test (R6) does exactly that against the real image, which is a
  stronger check.

## R3. The test framework and what the suite covers

- **Decision**: Vitest 5 with `@vitejs/plugin-react`, and Vite's built-in `resolve.tsconfigPaths`
  for the `@/` alias. (The plan named the `vite-tsconfig-paths` plugin; Vite 8 reports that it
  is now built in, so the plugin was dropped during implementation.) CI runs
  `npm test`, which maps to `vitest run --reporter=default --reporter=junit
  --outputFile.junit=reports/junit.xml`. The `server-only` import is aliased to an empty module in
  `vitest.config.mts`. `fetch` is stubbed per test, so neither the API nor Google is contacted.
  The first suite covers:
  - `src/proxy.ts`: requests to `/painel`, `/admin`, `/admin/x`, `/app`, and `/app/x` without
    session cookies redirect to `/entrar`, with the `de` parameter where applicable. A request
    carrying an expired access token plus a refresh token that the API rejects redirects to
    `/entrar` and clears the cookies. A signed-in visitor of `/entrar` is sent to `/painel`.
  - `src/app/api/auth/google/route.ts`: a valid token yields a 200 response with `redirectTo` and
    the four httpOnly cookies. A cross-origin request gets 403. A missing token gets 400. An API
    rejection is passed through with its status. An unreachable API gets 502.
- **Rationale**: The Next.js testing guide (`docs/01-app/02-guides/testing/vitest.md`) recommends
  Vitest for unit tests and notes that async Server Components are better tested end to end. The
  proxy and the route handler are plain async functions, so unit tests reach them directly and
  quickly. Vitest's JUnit reporter emits the same `<testsuite tests failures errors skipped>`
  attributes the API's summary parser reads, so the parser is reused almost unchanged. These tests
  are the constitution's Principle III checks for what exists today: Google sign-in, and signed-out
  users denied access to every protected route. Password sign-in does not exist yet (README, "Not
  built yet"). Its tests arrive with that feature, and this plan's Constitution Check records that.
- **Alternatives considered**:
  - Jest: needs more transform configuration for ESM and TSX, with no benefit here.
  - Playwright end-to-end tests against `next start` with a fake API: they would prove the same
    redirects through a real server, but CI would need a mock API process and browser downloads.
    They are deferred until there are UI flows that only a browser can test, such as keyboard use
    (Principle I).

## R4. Node.js version and dependency caching

- **Decision**: Node 22 LTS everywhere: `actions/setup-node` with `node-version: 22` and
  `cache: npm`, and `node:22-bookworm-slim` in the image. Add `"engines": {"node": ">=22"}` to
  `package.json` and a `.nvmrc` containing `22`. Install with `npm ci`.
- **Rationale**: Next 16.4.5 requires Node 20.9 or newer (its `package.json` `engines`), and the
  developer machine runs 22.14. Using 22 in CI, in the image, and locally means one runtime.
  `cache: npm` caches `~/.npm` keyed on `package-lock.json`, never `node_modules` or `.next`. This
  mirrors the API's rule of caching third-party jars but never `target/`.
- **Alternatives considered**: Node 24 (newer, but untested locally); caching `.next/cache`
  (faster builds, but it carries build output between revisions, which the API pipeline explicitly
  avoids).

## R5. Build-time versus runtime configuration

- **Decision**:
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is a repository **variable**. It is passed to `npm run build` in
    the build job only, so Next.js inlines it into the browser bundle. On a pull request, or when
    the variable is empty, the build uses an obviously fake placeholder,
    `ci-placeholder.apps.googleusercontent.com`, so pull requests from forks still build. The gate
    requires the real value only on publishing runs.
  - `API_BASE_URL` is runtime only. It is read by `src/lib/api.ts` through `process.env` on the
    server, set by the deployment, and never baked into the image.
- **Rationale**: `NEXT_PUBLIC_*` values are replaced at build time, so an image built without the
  real client id would ship a broken sign-in button. That is why the gate checks it (spec edge
  case). The value is public: every browser receives it. So it is not a secret, and keeping it out
  of secrets also lets it appear in logs. `API_BASE_URL` must stay runtime-configurable for FR-013.
  The build does not need it: the landing page is static, and every route that calls the API is
  dynamic.
- **Alternatives considered**: Reading the client id at runtime through a server-rendered prop.
  That would make one image valid for every environment, but it changes application code outside
  this feature's scope. It is recorded as a possible follow-up.

## R6. Container image

- **Decision**: A `Dockerfile` at the repository root:
  - base image `node:22-bookworm-slim`, pinned by digest (amended during implementation; see
    "Amendment" below);
  - `ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1`;
  - `ADD` the standalone tarball into `/app` (ADD extracts it), owned by the image's built-in
    `node` user;
  - `USER node`, `EXPOSE 3000`, and `CMD ["node", "server.js"]`;
  - a `HEALTHCHECK` that requests `/` using Node's built-in `fetch`, since the slim image ships without
    curl.

  A `.dockerignore` excludes everything except the tarball. The image job then runs a smoke test:
  it starts the loaded image with `API_BASE_URL=http://127.0.0.1:9` (an unreachable address), waits
  up to 30 seconds for `GET /` to return 200, and checks that `GET /admin` returns a redirect to
  `/entrar`. It always removes the container afterwards.
- **Rationale**:
  - Alpine with only the standalone server keeps the image small.
  - The `node` user covers FR-013's non-root requirement without creating a user.
  - `HOSTNAME=0.0.0.0` is required, because standalone binds to localhost otherwise (output.md,
    "Good to know").
  - The smoke test is the web equivalent of "the ELF runs on this libc". It proves the image
    starts, serves the static shell, and enforces the signed-out redirect inside the real
    container. That last check is a container-level Principle III check.
- **Alternatives considered**: `gcr.io/distroless/nodejs22` (smaller, but it has no shell for the
  health check and is harder to debug); `node:22-alpine` (rejected, see the amendment).
- **Amendment (implementation, 2026-11-09)**: The first local build showed that the standalone
  output traces native packages for the machine that built it (`@img/sharp-*`, `@next/swc-*`).
  CI builds on Ubuntu, which uses glibc, so an alpine (musl) runtime would carry binaries that
  cannot load there. This is the same trap the API pipeline avoids with its UBI builder. The site
  does not use `next/image` today, so nothing would fail yet, but the first page that does would
  break only in production. The runtime therefore uses `node:22-bookworm-slim` (glibc), the same
  libc as the runner. Running a Node binary as the `node` user and the `fetch` health check are
  unchanged.

## R7. Pinned actions

- **Decision**: Reuse the API pipeline's pinned SHAs for checkout, upload-artifact,
  download-artifact, setup-buildx, build-push, and login. Add
  `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0`, resolved through the
  GitHub API on 2026-11-09. `setup-java` is dropped.
- **Rationale**: This keeps one set of reviewed versions across both repositories, with every
  action pinned by full SHA.

## R8. Deployment target

- **Decision**: The handoff contract is unchanged: `workflow_dispatch` with the five string inputs
  `image`, `tag`, `digest`, `revision`, and `run_url`, sent to the workflow named by `DEPLOY_REPOSITORY`
  and `DEPLOY_WORKFLOW`. The "keep schedules alive" step re-enables only `DEPLOY_WORKFLOW`, and drops
  the API's hard-coded `watchdog.yml`.
- **Rationale**: `deployEntrePatasETurnos/.github/workflows/cd.yaml` deploys the API only. Its
  description and catch-up logic look for the newest API image, and it has no `watchdog.yml`. So the
  site needs its own workflow there, such as `cd-web.yaml`, declaring the same five inputs. That
  workflow is a dependency outside this repository (spec Assumptions). Re-enabling a workflow that
  does not exist would emit a misleading warning on every run.
- **Alternatives considered**: Dispatching the existing `cd.yaml` with a web image. This would
  overwrite the API's pinned image, so it was rejected.

## R9. What is dropped or renamed from the API pipeline

| API | Web | Why |
|-----|-----|-----|
| `NATIVE_IMAGE_XMX`, `EXECUTABLE_ARTIFACT` | `BUILD_ARTIFACT: site-standalone` | No native compilation |
| JDK 25 / Maven cache | Node 22 / npm cache | Toolchain |
| `./mvnw clean test` | `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` | Lint and types are separate failure kinds, with separate steps in one box |
| Tests run twice (in the test and native jobs) | Tests run once | `next build` has no test phase, so there is nothing to skip and the API's header note 1 does not apply. The build still type-checks, which is harmless. |
| surefire XML | Vitest JUnit XML at `reports/junit.xml` | Same attributes, so the parser is reused |
| Image smoke test: none | Image smoke test (R6) | Cheap for a web server, and it closes the gap left by not booting the server in the build job |
| `local/entrepataseturnos-api` | `local/entrepataseturnos-web` | Name |
| Summary row "Native executable" | "Production build" | Name |
