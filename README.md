# Entre Patas e Turnos: site

The website of Entre Patas e Turnos: the public landing page, the login, the **administrator panel**
for approving bookings, and the **tutor area**. It talks to
[`entrePatasETurnosAPI`](https://github.com/entrePatasETurnos/entrePatasETurnosAPI) (Quarkus).

Built with **Next.js 16** (App Router, Cache Components), **React 19** and **TypeScript**.

## Routes

| Route | Who | What |
|---|---|---|
| `/` | everyone | Landing page (static, prerendered) |
| `/entrar` | signed out | Login with Google |
| `/painel` | signed in | Asks the API for the role and redirects to `/admin` or `/app` |
| `/admin` | administrators | Approve, deny (with a reason), complete, approve all; filter by status |
| `/app` | tutors | The tutor's own bookings and their status |
| `/api/auth/google` | the login page | Exchanges a Google ID token for an API session |

## Running it locally

1. Start the API (in the API repo): `./db.sh && ./mvnw quarkus:dev`. It listens on `http://localhost:8080`.
2. Here: `cp .env.example .env.local` and fill in both variables (see the comments in the file).
3. `npm install`, then `npm run dev`, and open <http://localhost:3000>.

**One-time Google setup:** in Google Cloud Console, open the OAuth client whose id the API uses and add
`http://localhost:3000` (and later the production site's address) to **Authorized JavaScript origins**.
The site and the API must use the **same** client id, because the API checks the token's audience.

To make yourself an administrator, use the API's admin bootstrap or role-change endpoint
(`PUT /v1/users/{id}/role`, spec 016).

## How it works

```
Browser ──► Next.js server (this repo) ──► Quarkus API
             • pages render here
             • tokens live in httpOnly cookies
             • src/lib/* is the only code that calls the API
```

- **Backend for frontend.** The browser never calls the API and never sees a token. Pages, Server
  Actions and route handlers call it from the server through `src/lib/api.ts`. This also means the API
  needs no CORS configuration for the site.
- **Login** (`src/app/entrar`): Google's button gives the browser an ID token. `POST /api/auth/google`
  exchanges it with `POST /v1/auth/sessions/google` and stores the session in httpOnly cookies
  (`src/lib/session.ts`).
- **Session renewal** (`src/proxy.ts`): the access token lasts minutes. When its cookie expires, the
  proxy (Next.js 16's new name for middleware) uses the refresh token to get a new pair before the page
  renders.
- **Roles** (`src/lib/auth.ts`): the API keeps the role out of the token and has no "my role" endpoint
  yet, so the site asks a question only administrators may ask (listing all bookings): `200` means
  administrator, `403` means tutor. Every page and Server Action checks this again on the server; the
  proxy's cookie check only decides redirects.
- **Hypermedia links**: the API attaches `approve`, `deny` and `complete` links to a booking only when
  that action is allowed right now. The admin panel shows a button only when its link is present,
  instead of copying the API's rules into the UI.

## Scripts

```bash
npm run dev     # development server with hot reload
npm run build   # production build (also type-checks)
npm run start   # serve the production build
npm run lint      # ESLint
npm run typecheck # TypeScript, no output
npm test          # Vitest; also writes reports/junit.xml for CI
```

## Continuous integration

`.github/workflows/ci.yaml` runs on pull requests to `main`, pushes to `main`, and by hand. It
has one box per stage:

1. **Publication gate**: decides whether this run publishes (only pushes and manual runs on
   `main`). On those runs it fails at once if a setting below is missing.
2. **Checks**: `npm ci`, then lint, type check, and tests.
3. **Production build**: `npm run build` with `output: "standalone"`, packed into a checksummed
   `site-standalone.tar.gz`.
4. **Container image**: built once from that archive (`Dockerfile`), then started and asked three
   questions: does `/` answer 200, does `/admin` send a signed-out visitor to `/entrar`, and does it
   run as a non-root user.
5. **Docker Hub**: pushes `sha-<commit>`, which is never overwritten, and `latest`. Both tags point
   to the same image.
6. **Deployment handoff**: asks the deployment repository's workflow to deploy that exact image.
7. **Summary**: one table showing what each stage actually did.

Settings, under **Settings → Secrets and variables → Actions**. They are needed only by runs that
publish; pull requests need none.

| Name | Kind | Example |
|---|---|---|
| `DOCKERHUB_IMAGE` | variable | `entrepataseturnos/entrepataseturnos-web` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | variable | The same client id the API uses. It is embedded at build time, so changing it needs a new image. |
| `DEPLOY_REPOSITORY` | variable | `entrePatasETurnos/deployEntrePatasETurnos` |
| `DEPLOY_WORKFLOW` | variable | `cd-web.yaml` |
| `DOCKERHUB_USERNAME` | secret | The Docker Hub account that pushes |
| `DOCKERHUB_TOKEN` | secret | A Docker Hub access token with write access to that repository |
| `DEPLOY_DISPATCH_TOKEN` | secret | A fine-grained token with **Actions: Read and write** on the deployment repository only |

The deployment repository needs **its own workflow for the site**, declaring the `workflow_dispatch`
inputs `image`, `tag`, `digest`, `revision`, and `run_url`. Do not point `DEPLOY_WORKFLOW` at the
API's `cd.yaml`. The container reads `API_BASE_URL` at runtime, so the deployment sets it. Full
contracts are in `specs/002-ci-docker-publish/`.

## Not built yet

- **Banho & Tosa and Adestramento** appear as "Em breve": the API has no endpoints for them yet.
- **Booking form for tutors** (`POST /v1/accommodation-bookings` plus the pet list): the next feature.
- **Tutor names on admin cards**: the API sends only `ownerId`.
- **Password login**: the API supports password registration but not password sign-in yet.
- **API improvement worth making:** add `role` to `GET /v1/users/me`, then replace the role check in
  `src/lib/auth.ts`.
