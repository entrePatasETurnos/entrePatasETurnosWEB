# Feature Specification: CI Pipeline with Container Image Publication and Deployment Handoff

**Feature Branch**: `002-ci-docker-publish`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Generate a ci.yaml to build this project on GitHub Actions, modelled on the
entrePatasETurnosAPI pipeline (gate → tests → native executable → Docker image → Docker Hub → deployment
handoff → summary), with all adaptations for a web project. Tell me at the end which variables I have
to create on GitHub Actions."

## Context

The API repository already has a pipeline with one job per stage, checksummed hand-offs between jobs, a
single image built once and tagged twice, an immutable revision tag, a credential-free build path, a
deployment request to a separate deployment repository, and a run summary that never claims more than
the run proved. This feature gives the web site the same pipeline, with each stage replaced by its
web-project equivalent:

| API stage | Web equivalent |
|-----------|----------------|
| Publication gate | Publication gate (unchanged rules) |
| Tests (Maven test suite) | Checks: lint, type check, automated tests |
| Native executable | Production build of the site |
| Docker image (from the executable) | Container image (from the production build) |
| Docker Hub | Docker Hub (the site's own image repository) |
| Deployment handoff | Deployment handoff (the site's own deployment workflow) |
| Summary | Summary |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every change is checked before it can merge (Priority: P1)

A developer opens a pull request against `main`. The pipeline runs lint, type checking, the automated
test suite, and a full production build, each in its own pass/fail box, and reports the results on the
pull request. Nothing is published and no credentials are used.

**Why this priority**: Catching broken code before merge is the core value of CI and is useful on its own,
even before publication or deployment exist.

**Independent Test**: Open a pull request with a deliberate lint error, then one with a failing test,
then one with a build error; each fails in the matching box. A clean pull request passes every box and
the summary says publication was skipped because it is a pull request.

**Acceptance Scenarios**:

1. **Given** a pull request whose code passes all checks, **When** the pipeline runs, **Then** the
   checks, build, and image stages pass, and publication and deployment are reported as skipped
   (pull request).
2. **Given** a pull request with a failing automated test, **When** the pipeline runs, **Then** the
   checks stage fails, later stages do not run, and the summary shows the test counts including the
   failure.
3. **Given** a newer commit pushed to the same pull request while a run is in progress, **When** the new
   run starts, **Then** the older run for that pull request is cancelled and no other run is affected.

---

### User Story 2 - Merges to main publish a container image (Priority: P2)

When a change is merged into `main` (or the pipeline is started by hand on `main`), the pipeline builds
the site's container image once and publishes it to Docker Hub under two tags: an immutable tag naming
the source revision and a moving `latest` tag. Both tags name the same image.

**Why this priority**: A published, versioned image is what the deployment needs; it depends on the
checks in Story 1.

**Independent Test**: Merge a change to `main`; Docker Hub shows `sha-<commit>` and `latest` with the
same digest, and the run summary lists both tags and the digest.

**Acceptance Scenarios**:

1. **Given** a push to `main` with all publishing settings configured, **When** the pipeline succeeds,
   **Then** the image is available as `sha-<commit>` and `latest`, both with the same digest.
2. **Given** a push to `main` with any publishing setting missing, **When** the pipeline starts,
   **Then** it fails within the first stage, names every missing setting, and prints no setting value.
3. **Given** the pipeline is re-run for a commit whose `sha-<commit>` tag already exists, **When**
   publication runs, **Then** the existing tag is not overwritten, `latest` is not moved, and the run
   reports the already-published digest.
4. **Given** two merges to `main` in quick succession, **When** both pipelines run, **Then** they
   publish one at a time and `latest` ends up naming the newer commit.

---

### User Story 3 - Published images are handed to the deployment (Priority: P3)

After a successful publication, the pipeline asks the deployment repository to deploy the exact image
it just published, passing the image name, revision tag, digest, source revision, and a link to the run.

**Why this priority**: Completes continuous delivery, but the site can be deployed by hand from a
published image without it.

**Independent Test**: Merge to `main`; a run of the configured deployment workflow starts in the
deployment repository with the five inputs, and the summary links to that workflow's runs.

**Acceptance Scenarios**:

1. **Given** a successful publication, **When** the handoff runs, **Then** the deployment workflow is
   requested once with image, tag, digest, revision, and run link, and the summary says "requested".
2. **Given** the deployment credential has expired, **When** the handoff runs, **Then** the run fails
   with a message that names the expired credential and how to replace it, and the image remains
   published.
3. **Given** a temporary outage of the hosting platform, **When** the handoff runs, **Then** it retries
   a bounded number of times and, if all attempts fail, explains how to start the deployment by hand.

---

### User Story 4 - One honest summary per run (Priority: P3)

Every run ends with a single summary table listing each stage's outcome, built from what each stage
actually measured. A stage that did not run says "not reached", never "passed".

**Why this priority**: Makes the pipeline readable at a glance; supports all other stories.

**Independent Test**: Trigger a run that fails at the build stage; the summary shows the checks result
with counts, the build as FAILED, and image, publication, and deployment as "not reached".

**Acceptance Scenarios**:

1. **Given** any run, **When** it ends (success, failure, or cancellation), **Then** a summary table
   with rows for Checks, Production build, Container image, Publication, and Deployment is written.
2. **Given** a run where publication was intended but an earlier stage failed, **When** the summary is
   written, **Then** Publication and Deployment read "not reached".

### Edge Cases

- No automated test results are produced (the suite crashed before reporting): the checks row reads
  "not reached" for tests rather than "passed".
- The production build output is missing or incomplete: the build stage fails and nothing is handed on.
- A hand-off between stages arrives with a different checksum from the one produced: the receiving stage
  fails and nothing is published.
- A required build-time public setting (the Google sign-in client id) is empty on a publishing run: the
  gate fails before any build, because an image built without it would ship a broken sign-in page.
- A branch or ref name contains shell metacharacters: it is treated as data and cannot change what the
  pipeline does.
- The deployment target workflow is renamed, deleted, or does not accept the five inputs: the handoff
  fails with a message specific to that cause.
- The pipeline is started by hand on a branch other than `main`: everything except publication and
  deployment runs, and the summary says why they were skipped.

## Requirements *(mandatory)*

### Functional Requirements

**Triggers and concurrency**

- **FR-001**: The pipeline MUST run on pull requests targeting `main`, on pushes to `main`, and when
  started by hand.
- **FR-002**: Runs for the same pull request MUST cancel their own earlier runs; runs on `main` MUST NOT
  cancel each other and MUST publish one at a time.
- **FR-003**: The pipeline MUST grant read-only repository access by default, and only the stages that
  need more MUST receive it.

**Publication gate**

- **FR-004**: A single gate stage MUST decide whether the run publishes, using only the event type and
  the ref: publish only for a push to `main` or a manual run on `main`.
- **FR-005**: When the run publishes, the gate MUST verify that every required setting (listed under
  Key Entities) is present, fail naming every missing one, and never print any value.

**Checks**

- **FR-006**: The checks stage MUST run lint, type checking, and the automated test suite against a clean
  install of the locked dependencies.
- **FR-007**: The checks stage MUST report test counts (run, failed, errored, skipped) parsed from the
  test reports the run produced, not inferred from the exit status.
- **FR-008**: The automated test suite run by CI MUST include the checks required by the constitution
  (Principle III): sign-in by each supported method and denial of protected features to signed-out
  users, to the extent those features exist.

**Production build**

- **FR-009**: The build stage MUST produce the production build of the site from a clean state, with the
  build-time public settings supplied from repository configuration.
- **FR-010**: The build stage MUST verify the build output is complete and self-contained (it can be
  started without the source tree or development dependencies), checksum it, and hand it to the image
  stage.

**Container image**

- **FR-011**: The image stage MUST verify that the build output it received matches the checksum the
  build stage produced, and fail otherwise.
- **FR-012**: The image MUST be built exactly once per run, for linux/amd64, without registry
  credentials, exported as a single file, checksummed, and handed to the publish stage on every run.
- **FR-013**: The image MUST run the site as a non-root user and MUST read runtime settings (such as the
  API address) from its environment rather than having them baked in.
- **FR-014**: The image MUST NOT contain secrets, local environment files, or development dependencies.

**Publication**

- **FR-015**: Only the publish stage MUST receive registry credentials, and it MUST run only when the gate
  decided to publish.
- **FR-016**: The publish stage MUST verify the image file's checksum, then tag that exact image as
  `sha-<commit>` and `latest` and push both, reading the resulting digest back from the registry.
- **FR-017**: If `sha-<commit>` already exists in the registry, the publish stage MUST NOT push again,
  MUST NOT move `latest`, and MUST report the existing digest.

**Deployment handoff**

- **FR-018**: The handoff MUST run only when the gate decided to publish and publication succeeded, and
  MUST hold no repository permissions beyond its single deployment credential.
- **FR-019**: The handoff MUST request the configured workflow in the configured deployment repository,
  passing image, tag, digest, revision, and run link as data that cannot alter the request.
- **FR-020**: The handoff MUST retry only transient failures (no response, rate limiting, server
  errors), at most 3 attempts, and MUST fail immediately with a cause-specific message for invalid
  credential, insufficient access, missing target, and rejected inputs.
- **FR-021**: The handoff MUST never print the credential or the response body.

**Summary**

- **FR-022**: Every run MUST end with a summary table of stage outcomes, written even when earlier
  stages fail or are cancelled.
- **FR-023**: The summary MUST claim "published" or "requested" only when the corresponding stage
  succeeded in this run, and MUST list the tags and digest when an image was published.

### Key Entities

- **Build output**: the self-contained production build of the site; identified by its checksum.
- **Container image file**: the exported image built once per run; identified by its checksum.
- **Published image**: the image in Docker Hub, named by `sha-<commit>` (immutable) and `latest`
  (moving), identified by its digest.
- **Deployment request**: image, tag, digest, revision, and run link sent to the deployment workflow.
- **Repository settings** required on publishing runs:

  | Name | Kind | Purpose |
  |------|------|---------|
  | `DOCKERHUB_IMAGE` | variable | Image repository for the site, e.g. `<user>/entrepataseturnos-web` |
  | `DOCKERHUB_USERNAME` | secret | Docker Hub account that pushes the image |
  | `DOCKERHUB_TOKEN` | secret | Docker Hub access token with write access to that repository |
  | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | variable | Google sign-in client id, embedded at build time |
  | `DEPLOY_REPOSITORY` | variable | Deployment repository, as `owner/name` |
  | `DEPLOY_WORKFLOW` | variable | Workflow file in that repository that deploys the site |
  | `DEPLOY_DISPATCH_TOKEN` | secret | Fine-grained token with Actions read/write on that repository only |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pull requests to `main` show separate pass/fail results for checks, build, and
  image before merge.
- **SC-002**: A misconfigured publishing run fails within 1 minute, naming every missing setting.
- **SC-003**: For every successful run on `main`, the two published tags have identical digests, and the
  deployment request carries that same digest.
- **SC-004**: Re-running the pipeline for an already-published commit leaves its tag and `latest`
  unchanged in 100% of cases.
- **SC-005**: A pull request run completes in under 15 minutes.
- **SC-006**: No run log ever contains a credential value.
- **SC-007**: In every run, no summary row reports a stage as passed, published, or requested when that
  stage did not succeed.

## Assumptions

- The pipeline's structure, security rules, and messages follow the API pipeline; only the stages
  themselves change for a web project.
- The site has no automated test suite yet. This feature adds the test command and the smallest suite
  that satisfies FR-008 for what exists today (Google sign-in and signed-out access to `/painel`,
  `/admin`, `/app`). Tests for password sign-in arrive with that feature.
- Automated tests do not call the real entrePatasETurnosAPI or Google; they use substitutes, so CI needs
  no API instance and no test credentials.
- This feature adds the container image definition, which the repository does not have yet.
- The Google sign-in client id is public (it is sent to every browser) but embedded at build time, so it
  is a repository variable, not a secret, and one image targets one environment (production).
- `API_BASE_URL` is a runtime setting supplied by the deployment, not by CI.
- The deployment target is a workflow in the existing deployment repository that accepts the same five
  inputs as the API's deployment workflow; creating that workflow is outside this feature.
- The site's image is published to its own Docker Hub repository, separate from the API's.
