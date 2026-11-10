# Data Model: CI Pipeline

The pipeline has no database. Its "data" consists of the values that pass between jobs and the
settings it reads. Each entry below states the value's producer, its consumers, and the rule that
makes it valid.

## Gate decision

| Field | Values | Producer | Consumers |
|-------|--------|----------|-----------|
| `publish` | `true` \| `false` | `gate` | `publish`, `deploy`, `summary` |
| `reason` | `published` \| `skipped (pull request)` \| `skipped (ref is not main)` | `gate` | `summary` |

- `publish=true` if and only if `github.ref == refs/heads/main` and the event is `push` or
  `workflow_dispatch`. No other input is read.
- When `publish=true`, every setting marked "publishing runs" in the Repository settings table must
  be non-empty, or the gate fails.

## Check verdict

| Field | Format | Producer | Consumer |
|-------|--------|----------|----------|
| `verdict` | `passed (N tests, F failures, E errors[, S skipped])` \| `FAILED (...)` \| `not reached` | `checks` | `summary` |

- The verdict is computed from `reports/junit.xml`, never from the step's exit code. If no report
  exists, the verdict is `not reached`.

## Build output (the hand-off from `build` to `image`)

| Field | Format | Producer | Consumer |
|-------|--------|----------|----------|
| artifact `site-standalone` | one file, `site-standalone.tar.gz` | `build` | `image` |
| `sha256` | 64 lowercase hex characters | `build` | `image` (re-verified) |
| `summary` | `built — site-standalone.tar.gz, <size>` | `build` | `summary` |

Validity rules (research R2):

- The archive contains `server.js`, `.next/static/**` (non-empty), and `node_modules/next/`.
- The archive contains no `.env*` file.
- The SHA-256 the `image` job recomputes equals the producer's `sha256`; otherwise that job fails.

## Container image file (the hand-off from `image` to `publish`)

| Field | Format | Producer | Consumer |
|-------|--------|----------|----------|
| artifact `container-image` | `image.tar` (docker archive, linux/amd64) | `image` | `publish` |
| `sha256` | 64 lowercase hex characters | `image` | `publish` (re-verified) |

- The image is built once and passes the smoke test (research R6) before it is uploaded.
- Artifacts are kept for 1 day.

## Published image

| Field | Format | Producer | Consumers |
|-------|--------|----------|-----------|
| `image` | `${DOCKERHUB_IMAGE}` | `publish` | `deploy` |
| `revision_tag` | `sha-<40-hex commit>` | `publish` | `deploy` |
| `digest` | `sha256:<64 hex>` | `publish` (read back from the registry) | `deploy`, `summary` |
| `tags` | display string only | `publish` | `summary` (must never be parsed) |

State transitions of a revision tag:

```text
absent ──push──► published (immutable)
published ──re-run──► published (unchanged; `latest` not moved; existing digest reported)
```

## Deployment request

| Field | Source | Type |
|-------|--------|------|
| `ref` | literal `main` | string |
| `inputs.image` | `publish.image` | string |
| `inputs.tag` | `publish.revision_tag` | string |
| `inputs.digest` | `publish.digest` | string |
| `inputs.revision` | `github.sha` | string |
| `inputs.run_url` | `<server>/<repo>/actions/runs/<run_id>` | string |

- `requested=true` is written only when the dispatch returns HTTP 204.

## Repository settings

| Name | Kind | Required on | Read by |
|------|------|-------------|---------|
| `DOCKERHUB_IMAGE` | variable | publishing runs | `gate`, `publish`, `summary` |
| `DOCKERHUB_USERNAME` | secret | publishing runs | `gate`, `publish` |
| `DOCKERHUB_TOKEN` | secret | publishing runs | `gate`, `publish` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | variable | publishing runs (a placeholder is used otherwise) | `gate`, `build` |
| `DEPLOY_REPOSITORY` | variable | publishing runs | `gate`, `deploy`, `summary` |
| `DEPLOY_WORKFLOW` | variable | publishing runs | `gate`, `deploy`, `summary` |
| `DEPLOY_DISPATCH_TOKEN` | secret | publishing runs | `gate`, `deploy` |
