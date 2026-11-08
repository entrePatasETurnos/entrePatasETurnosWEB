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
npm run lint    # ESLint
```

## Not built yet

- **Banho & Tosa and Adestramento** appear as "Em breve": the API has no endpoints for them yet.
- **Booking form for tutors** (`POST /v1/accommodation-bookings` plus the pet list): the next feature.
- **Tutor names on admin cards**: the API sends only `ownerId`.
- **Password login**: the API supports password registration but not password sign-in yet.
- **API improvement worth making:** add `role` to `GET /v1/users/me`, then replace the role check in
  `src/lib/auth.ts`.
