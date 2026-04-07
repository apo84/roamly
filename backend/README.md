## Trove Backend / Storage

This directory contains the backend and storage configuration for Trove.

The goal is to run against a **managed PostgreSQL (with PostGIS)** instance in the cloud, while still supporting local development with Docker and an Express-based API that connects the React frontend to that database and to Supabase Auth.

---

### 1. Cloud PostgreSQL (recommended)

- Provision a managed PostgreSQL 14+ instance with **PostGIS** enabled (e.g. Supabase, Neon, RDS, Cloud SQL).
- Create at least two databases:
  - `trove_dev`
  - `trove_prod`
- Set a single connection URL per environment:
  - `DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/trove_dev`
  - `DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/trove_prod`
- Configure this variable in your backend runtime (CI/CD or hosting provider secrets).

The relational schema (users, creators, videos, locations, itineraries, collections, passport entries, etc.) is defined in the backend storage plans and will be implemented via Prisma/ORM migrations against `DATABASE_URL`.

---

### 2. Local development database (Docker)

For local work you can run Postgres (with PostGIS) via Docker:

```bash
cd backend
docker compose up -d
```

This uses `docker-compose.yml` in this directory and exposes Postgres on `localhost:5432` with:

- user: `trove`
- password: `trove`
- database: `trove_dev`

Example local env var:

```bash
DATABASE_URL=postgres://trove:trove@localhost:5432/trove_dev
```

---

### 3. Backend service (Express + TypeScript)

The backend is a standalone Node + TypeScript project under `backend/` with:

- `package.json` – scripts:
  - `dev` – run `src/server.ts` via `tsx`.
  - `build` – compile TypeScript (`tsc`) to `dist/`.
  - `start` – run compiled server (`node dist/server.js`).
  - `worker:geotag` – poll `geotag_jobs` and run Gemini + Geocoding pipeline (see `docs/backend/GEOTAG.md`).
- `tsconfig.json` – TypeScript config compiling `src` to `dist`.
- `src/`:
  - `server.ts` – Express bootstrap and route mounting.
  - `config/env.ts` – type-safe environment variable loader (throws on missing required vars).
  - `supabaseClient.ts` – Supabase admin client using the service role key.
  - `middleware/requireAuth.ts` – verifies backend-issued JWT and attaches `req.user`.
  - `routes/health.ts` – `GET /api/health`.
  - `routes/auth.ts` – OAuth start/callback and logout.
  - `routes/me.ts` – current user profile.

To run the API locally:

```bash
cd backend
cp .env.example .env        # fill in values
npm install                 # if not already done
npm run dev
```

By default the server listens on `http://localhost:4000`. The Vite dev server can be configured to proxy `/api/*` to this backend.

---

### 4. Auth architecture and Supabase decisions

We intentionally split responsibilities between **Supabase Auth** and the **Trove backend**:

- **Supabase Auth**:
  - Handles all OAuth provider flows (Google, GitHub, Apple, etc.).
  - Manages `auth.users` table and provider tokens.
  - Is never called directly from the frontend with service role keys.

- **Trove backend**:
  - Owns the Express API and the `public.users` profile table.
  - Uses a Supabase **service role** client (`supabaseAdmin`) only on the server to:
    - Exchange OAuth `code` for Supabase sessions.
    - Read/write rows in application tables (e.g., `public.users`).
  - Issues its own **JWT** and stores it in an HttpOnly cookie (`trove_session`) to authenticate and authorize requests.

Flow:

1. Frontend calls `POST /api/auth/oauth/:provider/start` to obtain a Supabase OAuth URL.
2. User is redirected to Supabase Auth, completes OAuth, and Supabase redirects back to `APP_OAUTH_REDIRECT_URL` with a `code`.
3. Backend handles `GET /api/auth/oauth/callback`:
   - Calls `supabaseAdmin.auth.exchangeCodeForSession(code)` to obtain a Supabase user.
  - Upserts a row in `public.users` with id/email/display_name/avatar_url.
  - Signs a JWT (`sub = user.id, email`) with `SESSION_SECRET`.
  - Stores the JWT in secure HttpOnly cookie `trove_session` and redirects to the frontend.
4. Subsequent requests to user-scoped endpoints (e.g., `/api/me`, future itineraries/collections/passport routes) go through `requireAuth`, which:
   - Reads the JWT from header or cookie.
   - Verifies it using `SESSION_SECRET`.
   - Populates `req.user` with `{ id, email }`.

This design keeps:

- OAuth and identity management in Supabase.
- Application-level authorization and user-scoped queries in the Trove backend.
- Service role keys never exposed to browsers.

---

### 5. Environment variables

Create a `.env` file in `backend/` based on `.env.example`:

```bash
cp backend/.env.example backend/.env
```

At minimum it should define:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/trove_dev
NODE_ENV=development
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_SECRET=replace-with-a-long-random-secret
APP_OAUTH_REDIRECT_URL=http://localhost:4000/api/auth/oauth/callback
```

Optional:

- `FRONTEND_ORIGIN` – allowed origin for CORS (defaults to `http://localhost:5173` in `server.ts`).

`src/config/env.ts` reads and validates these variables; missing required values will cause the server to fail fast on startup.

---

### 6. Current API surface

The following endpoints are implemented today:

- `GET /api/health`
  - Returns `{ "status": "ok" }`.
  - For uptime checks and liveness probes.

- `POST /api/auth/oauth/:provider/start`
  - Body: none.
  - Params: `provider` (e.g. `google`, `github`, `apple`).
  - Returns: `{ "url": "<supabase authorize URL>" }`.
  - Frontend should redirect the browser to this URL.

- `GET /api/auth/oauth/callback`
  - Query: `code` (from Supabase).
  - Behavior: exchanges `code` for Supabase session, upserts into `public.users`, sets `trove_session` cookie, and redirects to `/`.

- `POST /api/auth/logout`
  - Clears `trove_session` cookie and returns 204.

- `GET /api/me`
  - Protected by `requireAuth`.
  - Looks up `public.users` where `id = req.user.id`.
  - Returns `{ "user": { id, email, display_name, avatar_url, created_at, updated_at } }`.

Future endpoints (for videos, locations, itineraries, collections, passport entries) will follow the storage plans and reuse the same auth model.

---

### 7. Next steps for developers

- Implement Prisma/ORM schema and migrations matching the backend storage plan (users, creators, videos, locations, joins, itineraries, collections, passport entries).
- Add data endpoints (`/api/videos`, `/api/locations`, `/api/itineraries`, `/api/passport`, `/api/collections`) that:
  - Use `requireAuth` where user-scoped.
  - Use `supabaseAdmin` or an ORM client for Postgres queries.
  - Return JSON DTOs aligned with frontend types in `src/data/mockData.ts` and `src/data/barcelonaData.ts`.
- Gradually replace frontend mock data with live API calls using TanStack Query (`@tanstack/react-query`).

For a more detailed backend design, see the plan files under `.cursor/plans/` and `backend/context.md`.


# OAUTH flow 

### Auth flow (Supabase PKCE code flow)

We use Supabase Auth + Google OAuth, with a **PKCE code flow** initiated from the frontend and completed by the backend.

**Key pieces:**

- Frontend:
  - Uses `@supabase/supabase-js` with the **anon** public key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
  - Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://localhost:4000/api/auth/oauth/callback' } })` when the user clicks “Sign In”.
  - Supabase handles the browser redirect to Google and back.

- Supabase:
  - Has Google OAuth client ID/secret configured under **Authentication → Providers → Google**.
  - Has `http://localhost:4000/api/auth/oauth/callback` configured under **Authentication → URL Configuration → Redirect URLs**.
  - After successful Google login, redirects the user to:
    `http://localhost:4000/api/auth/oauth/callback?code=...`

- Backend:
  - Exposes `GET /api/auth/oauth/callback` in `src/routes/auth.ts`.
  - Reads the `code` query parameter and calls:
    `supabaseAdmin.auth.exchangeCodeForSession(code)` to obtain a Supabase session and user.
  - Upserts the user into `public.users`.
  - Issues its own JWT and stores it in the `trove_session` HttpOnly cookie.
  - Redirects back to the frontend (e.g. `/`).

**Important:**

- Supabase returns `?code=...` in the query string (code flow), not `#access_token=...` in the fragment (implicit flow). The backend only sees query params.
- All provider client IDs and secrets live in **Supabase and the provider (Google)**, **not** in `backend/.env`. The backend uses:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_OAUTH_REDIRECT_URL`
  - `SESSION_SECRET`
  to participate in the flow safely.