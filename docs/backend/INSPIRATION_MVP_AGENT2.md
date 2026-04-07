# Inspiration MVP — Agent 2 (Express API)

This document describes the **Track B** backend routes for travel-link inspiration: URL validation, redirect resolution, light unfurl (oEmbed + Open Graph), **`videos` writes via the Supabase service role**, and user-scoped library / collection writes.

**Prerequisites**

- Agent 1 migration applied (`user_note` / `visit_*` / `canonical_url`, RLS). See [INSPIRATION_MVP_AGENT1.md](../supabase/INSPIRATION_MVP_AGENT1.md).
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `backend/.env` (service role bypasses RLS on `videos`).
- `public.users` row exists for the caller (this API upserts the same minimal profile as `GET /api/me` before saving).

**Auth (all routes below)**

```http
Authorization: Bearer <supabase_access_token>
```

Errors use `{ "code": "<SNAKE_CASE>", "message": "..." }` where possible (invalid URL, duplicate save, etc.).

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/inspiration/unfurl?url=` | Preview metadata only (no DB). |
| `POST` | `/api/inspiration/parse` | Same as unfurl; body `{ "url": "..." }`. |
| `POST` | `/api/inspiration/save` | Full ingest + library save (+ optional collection item). |
| `GET` | `/api/inspiration` | List library or collection items. |
| `GET` | `/api/inspiration/:videoId` | Single saved item (library) by **video UUID**. |
| `PATCH` | `/api/inspiration/:videoId` | Update library note and/or attach place (`locationId` or `placeLabel` + `lat/lng`). |
| `DELETE` | `/api/inspiration/:videoId` | Remove library row only (`user_saved_videos`). |

---

### `POST /api/inspiration/save`

**Body**

```json
{
  "url": "https://www.instagram.com/reel/…",
  "note": "Why I saved this",
  "collectionId": "<uuid optional>",
  "visitStart": "2026-04-01",
  "visitEnd": "2026-04-10"
}
```

- `visitStart` / `visitEnd` are optional `YYYY-MM-DD` and only stored on **`collection_items`** when `collectionId` is set.
- `note` is written to **`user_saved_videos.user_note`** and, if a collection is specified, to **`collection_items.user_note`** (UI precedence: prefer collection note when both exist — see Agent 1 comments).

**Behavior**

1. Allowlisted host check; redirects followed with **per-hop** allowlist (SSRF mitigation).
2. Parse platform + external id → upsert **`videos`** (insert or update by `(platform, external_id)`; stable video UUID on updates).
3. Insert **`user_saved_videos`** (409 `DUPLICATE_SAVE` if already saved).
4. Optionally append **`collection_items`** with `position = max+1`.

**Response `201`**

```json
{
  "video": { "id", "external_id", "platform", "title", "caption", "thumbnail_url", "video_url", "canonical_url", "created_at", "ingested_at" },
  "savedLink": { "user_id", "video_id", "saved_at", "user_note" },
  "collectionItem": null | { "id", "collection_id", "video_id", "position", "user_note", "visit_start", "visit_end", "location_id" }
}
```

---

### `GET /api/inspiration`

**Query**

- `collectionId` (optional UUID) — list items in that collection (must be owned by the user).
- `hasLocation=true` — filter to rows with a non-null **`collection_items.location_id`** (collection mode) or, in library mode, to saved videos that appear in any of the user’s collection items with a location (map prep for Agent 7).

**Library response** (`items` from `user_saved_videos` + nested `videos`):

```json
{
  "items": [
    {
      "video": { ... },
      "libraryNote": "string | null",
      "savedAt": "timestamptz",
      "collectionItem": null
    }
  ]
}
```

**Collection response** includes `collectionItem` with `userNote`, `visitStart`, `visitEnd`, `locationId`, and a resolved `location` object (`name/city/country/lat/lng`) when available.

**Library response (`hasLocation=true`)** includes a lightweight `collectionItem` object with resolved location to support Agent 7 map feed.

---

### `PATCH /api/inspiration/:videoId`

Supports:

- `{ "note": "..." }` — update `user_saved_videos.user_note`
- `{ "locationId": "<uuid>", "collectionId": "<optional uuid>" }` — attach existing location to collection item
- `{ "placeLabel": "...", "lat": 41.38, "lng": 2.17, "collectionId": "<optional uuid>" }` — create location + attach

Notes:

- Place attach targets a collection item for the saved video. If no item exists, API returns a structured `BAD_REQUEST`.
- On place attach, backend also upserts the `video_locations` relation.

---

### Unfurl

- **TikTok** / **YouTube**: oEmbed endpoints when they respond.
- **Instagram**: often login-walled; falls back to Open Graph tags from HTML when the initial fetch returns a readable body.
- Timeouts are short; failures still allow **`save`** with a generated title.

---

## Allowlisted hosts

`instagram.com`, `www.instagram.com`, `tiktok.com`, `www.tiktok.com`, `m.tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com`, `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`

---

## Code layout

- `backend/src/routes/inspiration.ts` — HTTP handlers.
- `backend/src/services/inspiration/` — allowlist, redirect resolver, URL parser, unfurl helper, error helper.

**Tests**:

- `npm test` in `backend/` (URL parsing + allowlist).
- `npm run test:smoke:inspiration` (real token + live API end-to-end smoke script).

---

## What you should do after pulling this

1. **Env**: Confirm `SUPABASE_SERVICE_ROLE_KEY` is the **service role** (never ship to clients).
2. **Run backend**: `cd backend && npm run dev` (default port **4000** unless `PORT` is set).
3. **Smoke test** with a real token:
   - `GET /api/me` (syncs `public.users`).
   - `POST /api/inspiration/save` with an allowed URL.
   - `GET /api/inspiration` and confirm the item appears.
4. **Mobile / Agent 5**: Point `EXPO_PUBLIC_API_URL` at this API base (e.g. `http://localhost:4000` on a device-accessible host for physical devices).
5. **CORS**: If Expo hits a different origin, set `FRONTEND_ORIGIN` or extend CORS in `server.ts` for your dev origin.
