# Contract: Site Container Image

This contract describes what the deployment can rely on when it runs `${DOCKERHUB_IMAGE}:sha-<commit>`.

## I1. Runtime

| Property | Value |
|----------|-------|
| Platform | linux/amd64 |
| Process | `node server.js` (Next.js standalone server) |
| User | `node` (non-root) |
| Port | `3000/tcp` |
| Health check | `GET /` returns 200 |

## I2. Environment

| Variable | Required | Meaning |
|----------|----------|---------|
| `API_BASE_URL` | yes | Base URL of entrePatasETurnosAPI as seen from the container, e.g. `http://api:8080` |
| `PORT` | no (default 3000) | Port to listen on |
| `HOSTNAME` | no (default `0.0.0.0`) | Address to bind |

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is **already embedded** in the image at build time. Setting it at
runtime has no effect. Changing it requires a new build.

## I3. Guarantees

- The image contains no `.env*` files, no source tree, and no development dependencies.
- The image starts and serves `/` even when the API is unreachable, because the landing page is
  static.
- `/admin`, `/app`, and `/painel` redirect signed-out visitors to `/entrar`.
- The deployment must serve the site over HTTPS. In production the session cookies are `Secure`, so
  sign-in does not work over plain HTTP.
- The deployment must add the site's public origin to the Google OAuth client's Authorized JavaScript
  origins.
