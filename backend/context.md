# Roamly Backend Context

This file documents the backend service under `backend/` so that agents and developers can understand how it authenticates users, connects to Supabase, and owns application data such as `public.users`.

---

## Overview

- **Runtime**: Node.js + TypeScript  
- **Framework**: Express  
- **Auth**: Supabase Auth (OAuth providers, e.g. Google) + Supabase access tokens verified by the backend  
- **Database**: Managed PostgreSQL (with PostGIS) via Supabase (see `backend/README.md`)  
- **HTTP base URL (dev)**: `http://localhost:4000`  
- **API base path**: `http://localhost:4000/api`

The backend is a separate Node project located in `backend/` with its own `package.json` and `tsconfig.json`.

---

## Project layout

- `backend/`
  - `package.json` – backend dependencies and scripts (`dev`, `build`, `start`).
  - `tsconfig.json` – TypeScript config (`src` → `dist`).
  - `.env.example` – example environment for local development.
  - `docker-compose.yml` – Postgres/PostGIS container for local DB.
  - `README.md` – high-level storage/backend notes.
  - `context.md` – this file.
  - `src/`
    - `server.ts` – Express bootstrap and route mounting.
    - `config/env.ts` – centralized, type-safe environment loading.
    - `supabaseClient.ts` – Supabase admin client using the service role key.
    - `middleware/requireAuth.ts` – verifies Supabase access tokens and attaches `req.user`.
    - `routes/`
      - `health.ts` – health check endpoint.
      - `auth.ts` – legacy OAuth routes (currently unused in the PKCE flow).
      - `me.ts` – current-user profile endpoint and backend-owned upsert into `public.users`.

Build & run:

```bash
cd backend
npm install      # if not already done
npm run dev      # runs src/server.ts via tsx
npm run build    # tsc → dist/
npm start        # node dist/server.js
```

---

## Environment variables

Defined in `backend/.env.example` and used by `src/config/env.ts`:

- `DATABASE_URL` – Postgres connection string (used by Prisma/DB layer; see storage plan).
- `NODE_ENV` – `development` or `production`.
- `PORT` – backend HTTP port (default 4000).
- `SUPABASE_URL` – base URL of the Supabase project (e.g. `https://lzxyczhbsadjlqgazxvq.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY` – Supabase service-role key (server-side only; never exposed to clients).
- `SESSION_SECRET` – currently used only by legacy cookie-based auth (new flow uses Supabase tokens).
- `APP_OAUTH_REDIRECT_URL` – legacy backend callback URL (new flow uses frontend `/auth/callback`).
- `FRONTEND_ORIGIN` – allowed origin for CORS, e.g. `http://localhost:8080` for Vite dev.

`src/config/env.ts` loads and validates these values, throwing on missing required variables.

---

## Supabase admin client

- **File**: `backend/src/supabaseClient.ts`

Creates a Supabase client using the service-role key:

```ts
import { createClient } from "@supabase/supabase-js";
import { env } from "./config/env";

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

This client is used server-side for:

- Verifying Supabase access tokens: `supabaseAdmin.auth.getUser(accessToken)`.
- Reading/writing rows in application tables in `public.*` (e.g. `public.users`, itineraries, collections).

---

## Auth flow (Supabase PKCE + backend-owned profile)

We use Supabase Auth with Google OAuth and a **PKCE code flow** initiated from the frontend and completed by `@supabase/supabase-js` in the browser. The backend treats Supabase as the source of identity and owns the application-level user profile and data.

High-level flow:

1. Frontend calls:

   ```ts
   supabase.auth.signInWithOAuth({
     provider: "google",
     options: {
       redirectTo: "http://localhost:8080/auth/callback",
     },
   });
   ```

2. User authenticates with Google; Google redirects back to Supabase (`https://<ref>.supabase.co/auth/v1/callback`).
3. Supabase exchanges the Google code for a Supabase session and redirects the browser to:

   ```text
   http://localhost:8080/auth/callback?code=...
   ```

4. Frontend Supabase client is configured as:

   ```ts
   createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       flowType: "pkce",
       detectSessionInUrl: true,
     },
   });
   ```

   On first load of `/auth/callback`, `@supabase/supabase-js` detects the `code` in the URL, exchanges it for an access token, stores the session, and cleans up the URL.

5. `AuthCallback` page calls `supabase.auth.getSession()` to retrieve the session and then calls the backend `/api/me` endpoint with:

   ```http
   Authorization: Bearer <supabase-access-token>
   ```

6. Backend middleware `requireAuth` verifies the token via `supabaseAdmin.auth.getUser`, sets `req.user`, and `/api/me` upserts the user into `public.users` and returns their profile.

The end result after a successful sign-in:

- Supabase Auth (`auth.users`) has the identity.
- `public.users` has the app-level user profile keyed by the same id.
- The frontend has both a Supabase session and the app’s user profile.

---

## Auth middleware

- **File**: `backend/src/middleware/requireAuth.ts`

Types:

```ts
export interface AuthUser {
  id: string;
  email?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
```

Middleware implementation:

```ts
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization token" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = { id: data.user.id, email: data.user.email };
  return next();
}
```

Behavior:

- Reads the Supabase access token from the `Authorization` header.
- Uses `supabaseAdmin.auth.getUser(token)` to verify and decode the token.
- On success, attaches `req.user` and calls `next()`.
- On failure, returns `401`.

Use `requireAuth` on any user-scoped route (itineraries, collections, passport, etc.) and always use `req.user.id` as the `user_id` when inserting or filtering rows.

---

## User profile endpoint and backend-owned upsert

- **Route file**: `backend/src/routes/me.ts`
- **Endpoint**: `GET /api/me`
- **Guards**: `requireAuth`.

Behavior:

1. Reads `userId` and `email` from `req.user` (Supabase user id and email).
2. Upserts into `public.users`:

   ```ts
   await supabaseAdmin
     .from("users")
     .upsert(
       {
         id: userId,
         email,
         updated_at: new Date().toISOString(),
       },
       { onConflict: "id" },
     );
   ```

3. Reads back the full profile:

   ```ts
   const { data, error } = await supabaseAdmin
     .from("users")
     .select("id, email, display_name, avatar_url, created_at, updated_at")
     .eq("id", userId)
     .single();
   ```

4. Returns:

   ```json
   { "user": { "id": "...", "email": "user@example.com", "display_name": null, "avatar_url": null, "created_at": "...", "updated_at": "..." } }
   ```

This endpoint is the canonical way to:

- Ensure the app-level `public.users` table is in sync with Supabase Auth.
- Retrieve the current user profile for use in the frontend and for downstream routes.

---

## Health check

- **Route file**: `backend/src/routes/health.ts`
- **Endpoint**: `GET /api/health`
- **Behavior**: returns `{ "status": "ok" }`.

Use this for uptime checks and simple liveness probes.

---

## Server bootstrap

- **File**: `backend/src/server.ts`

Key responsibilities:

- Configure CORS with credentials:

  ```ts
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || "http://localhost:8080",
      credentials: true,
    }),
  );
  ```

- Install middlewares:
  - `cookieParser()`
  - `express.json()`
- Mount routes:
  - `app.use("/api", healthRoutes);`
  - `app.use("/api/auth", authRoutes);`
  - `app.use("/api", meRoutes);`
- Global error handler that logs errors and responds with `500` JSON.
- Start HTTP server on `PORT` from `env`.

---

## Frontend OAuth + sign-in data flow (for reference)

While this file focuses on the backend, it is useful for agents to understand the cooperating frontend pieces that trigger the backend-owned upsert and data return.

- **Supabase client**: `src/lib/supabaseClient.ts`

  ```ts
  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
    },
  });
  ```

- **Sign-in button**: `src/components/Navbar.tsx`

  ```ts
  const handleSignInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:8080/auth/callback",
      },
    });
  };
  ```

- **OAuth callback page**: `src/pages/AuthCallback.tsx`

  ```ts
  useEffect(() => {
    const finalize = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        console.warn("AuthCallback: no active Supabase session", { data, error });
        return;
      }

      try {
        const res = await fetch("http://localhost:4000/api/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        const body = await res.json().catch(() => null);

        if (res.ok && body?.user) {
          localStorage.setItem("roamlyCurrentUser", JSON.stringify(body.user));
        } else {
          console.warn("AuthCallback: /api/me did not return a user", res.status, body);
        }
      } catch (e) {
        console.error("AuthCallback: error calling /api/me", e);
      }

      navigate("/", { replace: true });
    };

    void finalize();
  }, [navigate]);
  ```

This ensures that after sign-in:

- Supabase has created a session and issued an access token.
- The backend has upserted the user into `public.users` and returned the app-level profile.
- The frontend has a cached copy of the current user (`localStorage["roamlyCurrentUser"]`), which can be read by hooks or components until a more sophisticated state management layer is introduced.

---

## How agents should extend the backend

- **New user-scoped features** (itineraries, collections, passport, saved videos):
  - Always apply `requireAuth` to ensure `req.user.id` is available.
  - Use `req.user.id` as the `user_id` foreign key when inserting or filtering DB rows.
- **Bootstrap endpoints**:
  - Consider adding a `/api/bootstrap` route that wraps `/api/me` plus initial user data (itineraries, collections, etc.) in one payload for the frontend.
- **New public features** (explore, map feeds):
  - May not require `requireAuth`, but should still validate inputs and consider rate limiting.
- **Database access**:
  - Use `supabaseAdmin` (or an ORM built on top of it) to interact with Postgres.
  - Keep schemas aligned with the storage plans under `.cursor/plans/`.
- **Additional providers**:
  - To add a new OAuth provider, configure it in Supabase and update the frontend sign-in UX if needed. The backend will continue to treat Supabase tokens generically via `auth.getUser`.

With this context, an agent can safely modify routes, extend the data model, and integrate new features while reusing the established OAuth + Supabase + backend-owned user model.

# Roamly Backend Context\n\nThis file documents the backend service under `backend/` so that agents and developers can understand how it authenticates users and connects to storage.\n\n---\n\n## Overview\n\n- **Runtime**: Node.js + TypeScript\n- **Framework**: Express\n- **Auth**: Supabase Auth (OAuth providers) + backend-issued JWT stored in HttpOnly cookie\n- **Database**: Managed PostgreSQL (with PostGIS) via Supabase project (see `backend/README.md`)\n- **HTTP base URL (dev)**: `http://localhost:4000`\n- **API base path**: `http://localhost:4000/api`\n\nThe backend is a separate Node project located in `backend/` with its own `package.json` and `tsconfig.json`.\n\n---\n\n## Project layout\n\n- `backend/`\n  - `package.json` – backend dependencies and scripts (`dev`, `build`, `start`).\n  - `tsconfig.json` – TypeScript config (`src` → `dist`).\n  - `.env.example` – example environment for local development.\n  - `docker-compose.yml` – Postgres/PostGIS container for local DB.\n  - `README.md` – high-level storage/backend notes.\n  - `context.md` – this file.\n  - `src/`\n    - `server.ts` – Express bootstrap and route mounting.\n    - `config/env.ts` – centralized, type-safe environment loading.\n    - `supabaseClient.ts` – Supabase admin client using service role.\n    - `middleware/requireAuth.ts` – verifies backend-issued JWT and attaches `req.user`.\n    - `routes/`\n      - `health.ts` – health check endpoint.\n      - `auth.ts` – OAuth start/callback and logout.\n      - `me.ts` – current-user profile endpoint.\n\nBuild & run:\n\n```bash\ncd backend\nnpm install      # if not already done\nnpm run dev      # runs src/server.ts via tsx\nnpm run build    # tsc → dist/\nnpm start        # node dist/server.js\n```\n\n---\n\n## Environment variables\n\nDefined in `backend/.env.example`:\n\n- `DATABASE_URL` – Postgres connection string (used by Prisma/DB layer; see storage plan).\n- `NODE_ENV` – `development` or `production`.\n- `PORT` – backend HTTP port (default 4000).\n- `SUPABASE_URL` – base URL of the Supabase project (e.g. `https://your-project.supabase.co`).\n- `SUPABASE_SERVICE_ROLE_KEY` – Supabase service-role key (server-side only; never exposed to clients).\n- `SESSION_SECRET` – long random secret used to sign backend JWTs.\n- `APP_OAUTH_REDIRECT_URL` – full URL where Supabase redirects after OAuth (dev default: `http://localhost:4000/api/auth/oauth/callback`).\n\n`src/config/env.ts` loads and validates these values, throwing on missing required variables.\n\n---\n\n## Supabase admin client\n\n- File: `backend/src/supabaseClient.ts`\n- Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to create an admin Supabase client.\n- Configuration disables token persistence and auto-refresh since this client is used only server-side for:\n  - Exchanging OAuth codes for Supabase sessions.\n  - Reading/writing rows in application tables (e.g. `public.users`).\n\n---\n\n## Auth flow and endpoints\n\nThe backend delegates actual OAuth (Google, GitHub, Apple, etc.) to Supabase Auth, then:\n\n1. Exchanges the returned `code` for a Supabase session.\n2. Upserts a profile row into `public.users`.\n3. Issues its own JWT and stores it in a secure, HttpOnly cookie `roamly_session`.\n4. Uses `requireAuth` middleware to protect user-scoped endpoints.\n\n### 1. Start OAuth\n\n- **Route file**: `backend/src/routes/auth.ts`\n- **Endpoint**: `POST /api/auth/oauth/:provider/start`\n- **Supported providers**: `google`, `github`, `apple` (extendable).\n- **Behavior**:\n  - Validates `provider`.\n  - Constructs Supabase authorize URL:\n    - Base: `${SUPABASE_URL}/auth/v1/authorize`\n    - Query: `provider`, `redirect_to=APP_OAUTH_REDIRECT_URL`\n  - Returns JSON:\n\n    ```json\n    { \"url\": \"https://<supabase>/auth/v1/authorize?...\" }\n    ```\n\n- **Frontend usage**:\n  - Call `POST /api/auth/oauth/google/start`.\n  - Redirect user to returned `url`.\n\n### 2. OAuth callback\n\n- **Endpoint**: `GET /api/auth/oauth/callback`\n- **Query params**: `code` (from Supabase Auth).\n- **Behavior**:\n  1. Calls `supabaseAdmin.auth.exchangeCodeForSession({ code, redirectTo: APP_OAUTH_REDIRECT_URL })` to get a Supabase session and user.\n  2. Upserts `public.users` with fields:\n     - `id` (Supabase `auth.users.id`)\n     - `email`\n     - `display_name` (from `user_metadata.full_name` or email)\n     - `avatar_url` (from `user_metadata.avatar_url`)\n  3. Signs a JWT:\n     - Payload: `{ sub: user.id, email: user.email }`\n     - Secret: `SESSION_SECRET`\n     - Expiry: 7 days.\n  4. Sets cookie `roamly_session` with:\n     - `httpOnly: true`\n     - `secure: NODE_ENV === 'production'`\n     - `sameSite: 'lax'`\n     - `maxAge: 7d`\n  5. Redirects to `/` (frontend root).\n\nErrors (missing `code`, exchange failure, or profile upsert failure) return appropriate `4xx`/`5xx` JSON responses.\n\n### 3. Logout\n\n- **Endpoint**: `POST /api/auth/logout`\n- **Behavior**:\n  - Clears the `roamly_session` cookie with the same options used when setting it.\n  - Returns HTTP 204 (no content).\n\n---\n\n## Auth middleware\n\n- **File**: `backend/src/middleware/requireAuth.ts`\n- **Exported types**:\n  - `AuthUser` – `{ id: string; email?: string | null }`\n  - `AuthenticatedRequest` – `express.Request` with optional `user` field.\n- **Function**: `requireAuth(req, res, next)`\n  - Checks for token in either:\n    - `Authorization: Bearer <token>` header, or\n    - `roamly_session` cookie.\n  - Verifies token with `SESSION_SECRET` using `jsonwebtoken`.\n  - On success: attaches `req.user = { id, email }` and calls `next()`.\n  - On failure: returns `401 Unauthorized`.\n\nUse this middleware on any route that requires an authenticated user (itineraries, collections, passport, etc.).\n\n---\n\n## User profile endpoint\n\n- **Route file**: `backend/src/routes/me.ts`\n- **Endpoint**: `GET /api/me`\n- **Guards**: `requireAuth` middleware.\n- **Behavior**:\n  - Reads `userId` from `req.user.id`.\n  - Queries Supabase:\n\n    ```ts\n    supabaseAdmin\n      .from(\"users\")\n      .select(\"id, email, display_name, avatar_url, created_at, updated_at\")\n      .eq(\"id\", userId)\n      .single();\n    ```\n\n  - Returns JSON:\n\n    ```json\n    { \"user\": { \"id\": \"...\", \"email\": \"...\", ... } }\n    ```\n\nThis endpoint is the canonical way for the frontend to fetch the current user profile after login.\n\n---\n\n## Health check\n\n- **Route file**: `backend/src/routes/health.ts`\n- **Endpoint**: `GET /api/health`\n- **Behavior**: returns `{ \"status\": \"ok\" }`.\n\nUse this for uptime checks and simple liveness probes.\n\n---\n\n## Server bootstrap\n\n- **File**: `backend/src/server.ts`\n- **Key responsibilities**:\n  - Configure CORS with credentials:\n\n    ```ts\n    cors({\n      origin: process.env.FRONTEND_ORIGIN || \"http://localhost:5173\",\n      credentials: true,\n    });\n    ```\n\n  - Install middlewares:\n    - `cookieParser()`\n    - `express.json()`\n  - Mount routes:\n    - `app.use(\"/api\", healthRoutes);`\n    - `app.use(\"/api/auth\", authRoutes);`\n    - `app.use(\"/api\", meRoutes);`\n  - Global error handler that logs errors and responds with `500` JSON.\n  - Start HTTP server on `PORT` from `env`.\n\n---\n\n## How agents should extend the backend\n\n- **New user-scoped features** (itineraries, collections, passport, saved videos):\n  - Always import and apply `requireAuth` to ensure `req.user.id` is available.\n  - Use `req.user.id` as the `user_id` when inserting or filtering DB rows.\n- **New public features** (explore, map feeds):\n  - May not require `requireAuth`, but should still be rate-limited and validated when implemented.\n- **Database access**:\n  - Use the existing Supabase admin client (`supabaseAdmin`) to read/write Postgres tables.\n  - Keep queries aligned with the relational schema defined in the backend storage plans.\n- **Additional providers**:\n  - To add a new OAuth provider, update the `supportedProviders` set in `routes/auth.ts` and configure the provider in Supabase.\n\nWith this context, an agent can safely add new routes, connect them to the Roamly schema, and reuse the existing auth/session model without re-deriving how the backend is wired.\n*** End Patch"/>}];
