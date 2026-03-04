# Trove Backend Context

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
          localStorage.setItem("troveCurrentUser", JSON.stringify(body.user));
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
- The frontend has a cached copy of the current user (`localStorage["troveCurrentUser"]`), which can be read by hooks or components until a more sophisticated state management layer is introduced.

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

