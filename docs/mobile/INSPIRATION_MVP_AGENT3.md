# Inspiration MVP — Agent 3 (mobile navigation & shells)

Follow-up implementation (Agents 4–8) is documented in `docs/mobile/INSPIRATION_MVP_AGENT4_8.md`.

## Environment variables (mobile local dev)

See `mobile/.env.example`. Summary:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (same project as web). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key only (never service role on the device). |
| `EXPO_PUBLIC_API_URL` | **Express backend** origin, e.g. `http://localhost:4000`. **Not** `VITE_APP_URL`, **not** `exp://` (that is Metro, not your API). Android emulator → often `http://10.0.2.2:4000`; physical device → your machine’s LAN IP. |

OAuth redirect for sign-in is **not** controlled by `EXPO_PUBLIC_*`; it is `Linking.createURL("auth/callback")` → `exp://…/--/auth/callback` (Expo Go) or `trove://…` (dev build). Add those URLs to Supabase **Redirect URLs**, not `VITE_APP_URL`.

---

## What shipped

- **New tab:** **Inspo** (`sparkles-outline` icon), placed between **Map** and **Collections**, with `headerShown: false` on the tab (inner stack owns headers), matching the **Collections** pattern.
- **Stack:** `mobile/app/(tabs)/inspiration/_layout.tsx`
  - `index` — title **Inspo** (library shell).
  - `add` — title **Add link** (add-flow shell).
  - `[id]` — title **Saved clip** (detail shell; `id` = `videos.id` UUID).

## Auth behavior (acceptance: gate Add, navigation signed-in vs signed-out)

| Screen | Signed out | Signed in |
|--------|------------|-----------|
| **Library (`index`)** | `SignInPrompt` | Placeholder + **Add** in header and primary button → `/(tabs)/inspiration/add` |
| **Add (`add`)** | `SignInPrompt` | Placeholder copy for Agent 4 |
| **Detail (`[id]`)** | `SignInPrompt` | Placeholder + UUID echo; invalid/non-UUID id shows a short error message |

Header **Add** appears only when authenticated so guests are not nudged into a screen that immediately blocks them.

## Reuse of collections

Collections remain under **`(tabs)/collections/*`** (including `[id]`). No duplicate collection routes under Inspo; users switch tabs to open a collection.

## Next agents (per `plan.md`)

- **Agent 4** — Replace `add.tsx` shell with form + `POST /api/inspiration/save`.
- **Agent 5** — Shared API client + types (`mobile/lib/api/inspiration.ts`, etc.).
- **Agent 6** — Replace `index` / `[id]` shells with `FlatList`, detail, pull-to-refresh, `GET` / `DELETE` wiring.

## Quick manual check

1. Open the app → **Inspo** tab → expect sign-in prompt when logged out.
2. Sign in → **Inspo** → **Add** in header and **Add a link** body button → **Add link** screen shows Agent 4 placeholder.
3. Navigate to `/(tabs)/inspiration/<valid-video-uuid>` (e.g. from a deep link or temporary `router.push` in dev) → detail shell when signed in.
