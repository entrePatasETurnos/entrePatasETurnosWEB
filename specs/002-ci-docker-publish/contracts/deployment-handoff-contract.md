# Contract: Deployment Handoff (web site)

**Producer**: the `deploy` job of `.github/workflows/ci.yaml` in this repository.

**Consumer**: a workflow in `${DEPLOY_REPOSITORY}` named by `${DEPLOY_WORKFLOW}`, for example
`entrePatasETurnos/deployEntrePatasETurnos` with `cd-web.yaml`.

This contract keeps the API's handoff contract (entrePatasETurnosAPI
`specs/011-ci-trigger-cd/contracts/deployment-handoff-contract.md` §C2) so that the deployment
repository can treat both producers the same way.

## H1. Transport

`POST /repos/{DEPLOY_REPOSITORY}/actions/workflows/{DEPLOY_WORKFLOW}/dispatches`. Success is
`204 No Content`.

## H2. Body

```json
{
  "ref": "main",
  "inputs": {
    "image":    "<DOCKERHUB_IMAGE>",
    "tag":      "sha-<40 hex>",
    "digest":   "sha256:<64 hex>",
    "revision": "<40 hex>",
    "run_url":  "https://github.com/<owner>/<repo>/actions/runs/<id>"
  }
}
```

All five values are strings, and the body is built with `jq --arg`, never by concatenating strings.

## H3. What the consumer must provide

The consumer is outside this repository, so these requirements are documented, not implemented here.

- A workflow file on the deployment repository's default branch.
- That workflow declares `workflow_dispatch` inputs `image`, `tag`, `digest`, `revision`, and
  `run_url`. Otherwise GitHub returns 422.
- That workflow deploys the **web** image and leaves the API's pinned image untouched. The existing
  `cd.yaml` deploys the API only and must not be the target.

## H4. Credential

`DEPLOY_DISPATCH_TOKEN` is a fine-grained personal access token whose only repository is
`DEPLOY_REPOSITORY`, with **Actions: Read and write** permission. If the API pipeline's token already
meets this, the same token may be reused.

## H5. Responses

| Status | Producer behaviour |
|--------|--------------------|
| 204 | Success; write `requested=true` |
| 000, 429, 5xx | Retry, at most 3 attempts in total |
| 401 | Fail: the token is invalid or expired |
| 403 | Fail: the token lacks Actions write access, or the organisation has not granted access |
| 404 | Fail: the repository or workflow was not found, or the token cannot see the repository |
| 422 | Fail: the target does not declare the five inputs |
| Any other | Fail: unexpected status |
