
# MVP plan: travel link inspiration (mobile-only, multi-agent)

## MVP scope (what ships)

**In scope**

- Signed-in user **pastes** an Instagram or TikTok **URL** (and optionally YouTube if already in your `platform_enum`).
- Backend **normalizes** URL, **unfurls** metadata (title, thumbnail, caption when available), **upserts** a `videos` row (or your chosen dedupe key), associates with **`auth.users` / `public.users`**.
- User adds **context**: **note** (“why”), optional **place** (text MVP; lat/lng if you add geocoding in a follow-up slice), optional **attach to collection**.
- **Library** screen: list saved items (from `user_saved_videos` + join `videos`).
- **Collection** screen: list items in a collection (`collection_items` + `videos`); create/rename collection minimal if not already in app.
- **Map** screen: show **pins only for items that have coordinates** (either from `locations` + `video_locations` or from `collection_items.location_id` → location row). MVP can be **manual lat/lng later**; Phase 1 map can show **only items with resolved `location_id`**.
- **Playback**: **open original URL** in browser / app (no in-app re-hosting).
- **RLS** on new/changed tables so users only see their rows.

**Out of scope (explicit)**

- Web app, share extensions, TikTok/Instagram OAuth, bulk “import likes,” drag-drop itinerary polish, serendipity algorithms, push notifications, offline-first, embed WebView player reliability work.

---

## Shared contracts (all agents must align)

**Auth**

- Mobile uses existing **Supabase session**; API calls use **`Authorization: Bearer <access_token>`** (same pattern as web `/api/me` if you reuse Express, or **Supabase client + RLS-only** if no Express for this MVP—pick one architecture below).

**Architecture fork (choose one before coding)**

- **Track A – Supabase-only:** RLS + RPC or direct table access from mobile with **service role never on device**. Simpler ops; logic in SQL/RPC.
- **Track B – Express API:** Mobile → your **`VITE_API_URL`-style mobile env** e.g. `EXPO_PUBLIC_API_URL` → `POST /api/inspiration`. Unfurl + dedupe on server. Matches existing backend style.

*The plan below assumes **Track B (Express)** for “unfurl + dedupe” in one place; if you choose Track A, merge Agent 1 + 2 into SQL/RPC and drop HTTP routes.*

**URL allowlist**

- Hosts: `instagram.com`, `www.instagram.com`, `tiktok.com`, `www.tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com` (+ `youtube.com` / `youtu.be` if desired).

**Dedupe**

- `videos`: unique on `(platform, external_id)` as in your schema **or** add **`canonical_url`** + unique constraint if `external_id` is flaky.

**Error UX**

- Invalid URL, unfurl failure, duplicate save → structured JSON `{ code, message }`.

---

## Agent 0 — Product / schema steward (lightweight, can be a human)

**Owns**

- Lock MVP scope, approve schema deltas, merge order.

**Deliverables**

- Signed-off **OpenAPI or TypeScript types** for mobile + backend.
- List of **env vars**: `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_API_URL` (if B).

**Acceptance**

- One page “MVP user story” + screenshot wire checklist.

---

## Agent 1 — Database & RLS (Supabase)

**Status (repo):** Migration added at `supabase/migrations/20260328120000_inspiration_mvp_columns_and_rls.sql`. Manual steps: `docs/supabase/INSPIRATION_MVP_AGENT1.md`. Schema notes: `backend/backend_storage_plan.md` (end of file).

**Owns**

- Migrations for MVP columns and policies.

**Work**

1. **`collection_items`**: add `user_note text null`, `visit_start date null`, `visit_end date null` (or single `visit_window text`).
2. **`user_saved_videos`**: optional `user_note text null` (library-level only; collection note wins when both exist—document precedence).
3. **`videos`**: optional `canonical_url text unique` or `source_url text` (store pasted URL); ensure `video_url` or permalink column usage is documented.
4. **RLS**
   - `user_saved_videos`: user can read/write rows where `user_id = auth.uid()`.
   - `collection_items`: via `collections.user_id = auth.uid()`.
   - `collections`: user owns rows.
   - `videos`: **either** public read for all authenticated users **or** restrict read to videos referenced by their saves (stricter; harder). MVP shortcut: **videos readable to owner only** is wrong if video is shared catalog—simplest MVP: **videos insert/update only via service role / backend**; mobile **never** writes `videos` directly if Express uses **service role**; if mobile writes, you need insert policy + dedupe in RPC.

**Recommendation for MVP with Express:**  
- Mobile **does not** insert into `videos` directly.  
- Only **backend service role** inserts/updates `videos`.  
- Mobile inserts **`user_saved_videos`** / **`collection_items`** via API that checks ownership—or Express does all writes.

**Acceptance**

- `sql` migrations apply cleanly; RLS tests: user A cannot read user B’s saves.

**Dependencies**

- None (first merge).

---

## Agent 2 — Backend API: ingest + list (Express, if Track B)

**Status (repo):** Implemented under `backend/src/routes/inspiration.ts` + `backend/src/services/inspiration/`. Details: `docs/backend/INSPIRATION_MVP_AGENT2.md`. Run parser/allowlist tests: `cd backend && npm test`.

**Owns**

- Routes under e.g. `POST /api/inspiration/parse`, `POST /api/inspiration/save`, `GET /api/inspiration`, `GET /api/inspiration/:id`, `PATCH`, `DELETE` (minimal subset for MVP).

**Specifications**

1. **`POST /api/inspiration/save`**  
   - Body: `{ url, note?, collectionId?, visitStart?, visitEnd? }`  
   - Steps: validate allowlist → resolve redirects (timeout, max bytes) → parse platform + external id → upsert `videos` (service role) → insert `user_saved_videos` → if `collectionId`, insert `collection_items` with `position` = max+1, `user_note` = note, dates.  
   - Return: `{ video, savedLink, collectionItem? }`.

2. **`GET /api/inspiration`**  
   - Query: `?collectionId=` optional.  
   - Returns list with `video` + join fields + user note.

3. **`GET /api/inspiration/unfurl`** (optional separate) or fold into save preview: return metadata without persisting.

**Unfurl**

- Implement `unfurlService`: try oEmbed / OG tags; **no** scraping login walls; set timeouts.

**Auth**

- Reuse existing `requireAuth` + `getUser` from Supabase JWT.

**Acceptance**

- Postman collection or automated tests for happy path + invalid URL.

**Dependencies**

- Agent 1 migrations merged (or stub with nullable columns).

---

## Agent 3 — Mobile: navigation & shells

**Status (repo):** Expo Router stack under `mobile/app/(tabs)/inspiration/` (`index`, `add`, `[id]`) plus **Inspo** tab in `mobile/app/(tabs)/_layout.tsx`. Notes: `docs/mobile/INSPIRATION_MVP_AGENT3.md`.

**Owns**

- Expo Router structure for MVP screens **without** heavy UI polish.

**Work**

- Routes e.g. `(tabs)/inspiration/index`, `inspiration/add`, `inspiration/[id]`, optional `collections/[id]` reuse.
- Tab bar entry: **“Saved”** or **“Inspo”** (one new tab or fold into existing **Collections**—pick one to avoid tab sprawl; spec: **new tab “Inspo”** with Library + Add).

**Acceptance**

- Navigation works signed-in vs signed-out (gate Add).

**Dependencies**

- None parallel with Agent 4 after Agent 5 types exist.

---

## Agent 4 — Mobile: Add link flow

**Status (repo):** Implemented in `mobile/app/(tabs)/inspiration/add.tsx` using typed API module + collection picker + open-link action.

**Owns**

- `inspiration/add.tsx` UI + API client.

**Specifications**

- `TextInput` URL, multiline note, optional picker for **existing collection** (dropdown from `GET /api/collections` if exists, or hardcode “default trip” later).
- Submit → `POST /api/inspiration/save` → toast/alert → navigate to detail or library.
- **Open in app** button uses `Linking.openURL(video_url or canonical_url)`.

**Acceptance**

- Saves a real IG/TikTok URL end-to-end against staging API.

**Dependencies**

- Agent 2 API + Agent 5 client types.

---

## Agent 5 — Mobile: API client & types

**Status (repo):** Implemented as `mobile/lib/api/inspiration.ts` and `mobile/types/inspiration.ts` (single shared client used by Add, Library, Detail, Map).

**Owns**

- `mobile/lib/api/inspiration.ts` with typed functions; `mobile/types/inspiration.ts`.

**Specifications**

- Uses `fetch` + `Authorization` from Supabase session (`supabase.auth.getSession()`).
- Base URL `process.env.EXPO_PUBLIC_API_URL`.

**Acceptance**

- Single module imported by Add + Library + Map; no duplicated fetch logic.

**Dependencies**

- Agent 2 OpenAPI/types (Agent 0 publishes).

---

## Agent 6 — Mobile: Library list + detail

**Status (repo):** Implemented in `mobile/app/(tabs)/inspiration/index.tsx` and `mobile/app/(tabs)/inspiration/[id].tsx` (pull-to-refresh, open link, remove save, note/date/location display).

**Owns**

- `inspiration/index.tsx`, `inspiration/[id].tsx`.

**Specifications**

- List: `FlatList`, thumbnail from `videos.thumbnail_url`, title, platform badge, first line of note.
- Detail: full note, dates, **Open link**, optional **remove save** `DELETE` (if in MVP).
- Pull-to-refresh.

**Acceptance**

- 20+ mock saves perform OK (pagination optional out of scope).

**Dependencies**

- Agent 5.

---

## Agent 7 — Mobile: Map pins

**Status (repo):** Implemented as list-based map tab in `mobile/app/(tabs)/map.tsx` using `GET /api/inspiration?hasLocation=true` with explicit empty state (no `react-native-maps` dependency added in MVP).

**Owns**

- Map screen showing only items with **resolved location**.

**Specifications**

- Data: `GET /api/inspiration?hasLocation=true` or join that returns `lat/lng`.  
- If no coordinates in MVP, **hide map empty state**: “Add a place to see pins” (place entry can be Agent 8 or Phase 2).

**Tech**

- Reuse **react-native-maps** or existing map lib if already in project; if none, MVP = **list-only map tab** with message (agent documents dependency).

**Acceptance**

- At least one seeded item with location shows a pin.

**Dependencies**

- Agent 2 returns lat/lng OR Agent 1+2 wire `location_id` on `collection_items`.

---

## Agent 8 (optional MVP slice) — Place attach

**Status (repo):** Implemented minimal manual place attach from detail screen (`mobile/app/(tabs)/inspiration/[id].tsx`) via backend `PATCH /api/inspiration/:videoId` (`placeLabel`, `lat`, `lng`, optional `collectionId`).

**Owns**

- On detail screen: “Set place” → text search or lat/lng manual (minimal).

**Specifications**

- `PATCH /api/inspiration/:id` with `{ locationId }` or `{ placeLabel, lat, lng }` creating `locations` + `video_locations` + updating item.

**Can be deferred** if Agent 7 ships empty state only.

---

## Merge order (minimize conflicts)

1. **Agent 1** migrations + RLS  
2. **Agent 2** backend routes (feature branch off latest DB)  
3. **Agent 0** publishes shared types  
4. **Agent 5** client  
5. **Agent 3** navigation shell  
6. **Agent 4** Add + **Agent 6** Library/detail in parallel  
7. **Agent 7** Map  
8. **Agent 8** place attach last  

---

## Definition of Done (MVP)

- User signs in on **mobile** → pastes allowed URL → sees item in **library** with thumbnail/title → taps **open** → OS opens IG/TikTok/YouTube.  
- Optional: item attached to **one collection** with **note + dates** stored.  
- Map tab: either **pins for geotagged items** or **explicit empty state** (document which shipped).  
- No web changes; backend changes allowed if Track B.

---

## Agent handoff checklist (paste into each ticket)

- **Inputs:** env vars, auth header pattern, allowlisted hosts.  
- **Outputs:** PR with tests or screen recording.  
- **Blockers:** schema not merged / API not deployed.  
- **Non-goals:** share extension, embed player, web.

If you later choose **Supabase-only (Track A)**, replace Agent 2 with **RPC `save_inspiration(url, …)`** + policies, and Agent 5 calls `supabase.rpc` instead of `fetch` to Express.