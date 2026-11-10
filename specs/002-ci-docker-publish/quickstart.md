# Quickstart: Validating the CI Pipeline

The workflow and the files it relies on are described in
[contracts/ci-pipeline-contract.md](./contracts/ci-pipeline-contract.md).

## Prerequisites

- Node 22 and Docker installed locally.
- On GitHub, under **Settings → Secrets and variables → Actions**, the settings listed in
  [data-model.md](./data-model.md#repository-settings).
- In `deployEntrePatasETurnos`, a web deployment workflow that declares the five inputs
  ([deployment-handoff-contract.md](./contracts/deployment-handoff-contract.md#h3-what-the-consumer-must-provide)).
  This is needed only for scenario 5.

## 1. Run the checks locally (same commands as the Checks box)

```bash
npm ci
npm run lint
npm run typecheck
npm test            # writes reports/junit.xml
```

**Expected**: every command exits with status 0, and `reports/junit.xml` lists the proxy and
Google sign-in suites with no failures or errors.

## 2. Build and run the image locally (same as the Production build and Container image boxes)

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=ci-placeholder.apps.googleusercontent.com npm run build
cp -r .next/static .next/standalone/.next/
tar -C .next/standalone -czf site-standalone.tar.gz .
docker build -t local/entrepataseturnos-web:dev .
docker run --rm -d --name web -p 3000:3000 -e API_BASE_URL=http://127.0.0.1:9 local/entrepataseturnos-web:dev
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/          # 200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/admin
docker exec web id -u                                                     # not 0
docker rm -f web
```

**Expected**:

- `/` returns 200.
- `/admin` returns 307 with a redirect to `/entrar?de=%2Fadmin`.
- `id -u` prints a non-zero user id.

## 3. Pull request run (User Story 1)

Open a pull request against `main`.

**Expected**:

- The Checks, Production build, and Container image boxes are green, and the Docker Hub and
  Deployment handoff boxes are skipped.
- The summary reads: Publication `skipped (pull request)`, Deployment `not requested (pull request)`.
- Push a commit with a failing test. The Checks box is red, the summary shows `FAILED (… 1
  failures …)`, and later rows read `not reached`.

## 4. Misconfiguration (User Story 2, scenario 2)

Temporarily delete the `DOCKERHUB_IMAGE` variable, then run the workflow by hand on `main`.

**Expected**: the Publication gate fails within a minute with
`this run publishes but is missing: repository variable DOCKERHUB_IMAGE`. Restore the variable
afterwards.

## 5. Publication and handoff (User Stories 2 and 3)

Merge to `main`.

**Expected**:

- Docker Hub shows `sha-<commit>` and `latest` with the same digest.
- The summary lists both tags and the digest, and Deployment reads `requested`.
- A run of `DEPLOY_WORKFLOW` starts in the deployment repository with the five inputs.

## 6. Immutability (User Story 2, scenario 3)

Re-run the workflow from scenario 5.

**Expected**: a notice says `sha-<commit> is already published … not moving latest`, and the
digest in Docker Hub is unchanged.
