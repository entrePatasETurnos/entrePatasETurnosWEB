# Contract: `.github/workflows/ci.yaml`

This is the contract the workflow file implements. Every clause traces to a requirement in
[spec.md](../spec.md). A change that breaks a clause is a change to this contract and must update it.

## C1. Triggers, permissions, concurrency

- Triggers: `pull_request` on `main`, `push` on `main`, and `workflow_dispatch`. No other events
  (FR-001).
- Workflow-level `permissions: contents: read`. The `deploy` job sets `permissions: {}` (FR-003,
  FR-018).
- `concurrency.group = ${{ github.workflow }}-${{ github.ref }}`, with `cancel-in-progress` true only
  for `pull_request` (FR-002).

## C2. Jobs, in order

| Job id | Box name | needs | Runs when | Credentials | Timeout |
|--------|----------|-------|-----------|-------------|---------|
| `gate` | Publication gate | none | always | reads presence only | 5 min |
| `checks` | Checks | gate | gate succeeded | none | 15 min |
| `build` | Production build | checks | checks succeeded | none | 15 min |
| `image` | Container image | build | build succeeded | none | 15 min |
| `publish` | Docker Hub | gate, image | `needs.gate.outputs.publish == 'true'` | Docker Hub | 15 min |
| `deploy` | Deployment handoff | gate, publish | `needs.gate.outputs.publish == 'true'` | `DEPLOY_DISPATCH_TOKEN` only | 10 min |
| `summary` | Summary | all six | `always()` | none | 5 min |

## C3. Gate (FR-004, FR-005)

- The gate reads only `github.event_name` and `github.ref`, both passed through `env`.
- On publishing runs it checks the seven settings in [data-model.md](../data-model.md) for emptiness.
  It emits a single `::error::` naming all missing settings and prints no values.

## C4. Checks (FR-006 to FR-008)

The job runs these steps in order, each as its own step:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

An `if: always()` step then parses `reports/junit.xml` into `verdict`.

## C5. Build (FR-009, FR-010)

- The job starts from a clean checkout and runs `npm ci`, then `npm run build`, with
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` taken from the repository variable or the CI placeholder.
- It assembles the standalone output, runs the validity checks in data-model "Build output", packs
  the archive, checksums it, and uploads it with `if-no-files-found: error` and `retention-days: 1`.

## C6. Image (FR-011 to FR-014)

1. Download the build output and verify its checksum against `needs.build.outputs.sha256`.
2. Build the image with Buildx: `file: Dockerfile`, `platforms: linux/amd64`, `push: false`,
   `tags: local/entrepataseturnos-web:${{ github.sha }}`, and
   `outputs: type=docker,dest=/tmp/image.tar`.
3. Load the image and run the smoke test from research R6:
   - `GET /` returns 200 within 30 seconds;
   - `GET /admin` returns 307 with a `Location` header ending in `/entrar?de=%2Fadmin`;
   - the process runs as a non-root user (`docker exec … id -u` is not `0`).
4. Checksum the image file and upload it, on every run.

## C7. Publish (FR-015 to FR-017)

The steps are the same as the API's, with the image name taken from `DOCKERHUB_IMAGE`:

- Verify the checksum.
- Log in.
- If `sha-<sha>` already exists, reuse its digest and leave `latest` alone.
- Otherwise tag both and push both, then read the digest back from the registry.
- Outputs: `digest`, `tags`, `image`, `revision_tag`.

## C8. Deploy (FR-018 to FR-021)

The request body, retry policy (3 attempts, 5-second and 15-second backoff, for status 000, 429, or
5xx), and the cause-specific messages for 401, 403, 404, and 422 are identical to the API's. See
[deployment-handoff-contract.md](./deployment-handoff-contract.md).

One difference: the job re-enables only `${DEPLOY_WORKFLOW}`, not `watchdog.yml`. It never prints
the token or the response body, and never uses `set -x`.

## C9. Summary (FR-022, FR-023)

The summary has these rows, in order:

- Checks
- Production build
- Container image
- Publication
- Deployment

The wording rules are identical to the API's, so "published" and "requested" appear only when that
job succeeded in this run. The Published image and Requested deployment sections appear under the
same conditions.
