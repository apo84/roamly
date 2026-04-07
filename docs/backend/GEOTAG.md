# Automatic geotagging (Gemini — direct coordinates)

This document describes the **auto-geotag pipeline** (prompt **v2**): Gemini returns **one** WGS84 **latitude / longitude** per video; there is **no** Google Geocoding API call. It also covers Supabase schema, env vars, the worker, the map API, and how the mobile map fits in.

Canonical older spec: [`geoencodingplan.md`](../../geoencodingplan.md) (may still mention geocoding; implementation follows **this** doc).

---

## What it does

1. When a user saves a new Inspo link (`POST /api/inspiration/save`) and `GEOTAG_ENABLED=1`, the backend enqueues **`geotag_jobs`** (unless `GEOTAG_ASYNC=0` and `GEOTAG_ON_SAVE=1`, which runs inline — dev only).
2. The **worker** (`npm run worker:geotag`) claims jobs and calls **Gemini** with video metadata. The model returns JSON with **one** `place` object containing **`latitude`** and **`longitude`** (or `"place": null` if unsure).
3. After an optional **ambiguity penalty**, confidence must meet **`GEOTAG_MIN_CONFIDENCE_TO_WRITE`** to insert **`locations`** (`source = gemini_llm`) + **`video_locations`** (`auto_geotagged = true`).
4. User-attached places from **`PATCH /api/inspiration/:videoId`** set **`auto_geotagged = false`** and **`role = user_manual`**. Re-runs delete only **`auto_geotagged = true`** links.

**Note:** The `geocode_cache` table from the migration is **unused** in v2; you can leave it or drop it later.

---

## Supabase: apply schema changes

### Option A — CLI (recommended)

```bash
supabase db push
```

### Option B — SQL Editor

Paste and run the full file: `supabase/migrations/20260329140000_geotag_pipeline.sql`

---

## External API: Gemini only (for geotag)

### `GEMINI_API_KEY`

- **What:** **Generative Language API** (Gemini).
- **Where:** [Google AI Studio — API keys](https://aistudio.google.com/apikey)
- **Backend:** `GEMINI_API_KEY=...`
- **Optional:** `GEMINI_MODEL` (default `gemini-2.0-flash`) — [Models](https://ai.google.dev/gemini-api/docs/models)

You **do not** need `GOOGLE_MAPS_GEOCODING_API_KEY` for the geotag pipeline anymore.

---

## Map tiles in the app (“our own map”)

Your **data** is just **lat/lng** from the API (`GET /api/map/pins`). **Displaying** a map is separate:

| Approach | What you need |
|----------|----------------|
| **Current stack:** `react-native-maps` in `mobile/app/(tabs)/map.tsx` | **iOS:** Apple Maps by default — no Google key. **Android:** Google tiles via `PROVIDER_GOOGLE`; set **`EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY`** in `mobile/.env` (see `mobile/app.config.js`). [Enable Maps SDK for Android](https://console.cloud.google.com/apis/library/maps-android-backend.googleapis.com) on that key. |
| **Fully custom / non-Google** | Swap to **Mapbox** (`@rnmapbox/maps`), **MapLibre**, or similar: same lat/lng markers work; follow that SDK’s Expo/React Native install and token (different from Gemini). |

There is nothing special to “import” coordinates: your backend already stores **`locations.lat` / `locations.lng`** and returns pins; any map SDK that accepts markers can use them.

---

## Backend environment variables

| Variable | Required for geotag | Description |
|----------|---------------------|-------------|
| `GEOTAG_ENABLED` | Toggle | `1` / `true` to enqueue jobs on save |
| `GEOTAG_ASYNC` | No | Default `true` |
| `GEOTAG_ON_SAVE` | No | Inline run when `GEOTAG_ASYNC=false` |
| `GEMINI_API_KEY` | **Yes** | AI Studio key |
| `GEMINI_MODEL` | No | Default `gemini-2.0-flash` |
| `GEMINI_TIMEOUT_MS` | No | Default `45000` |
| `GEOTAG_MIN_CONFIDENCE_TO_WRITE` | No | Default `0.35` |
| `MAP_PIN_MIN_CONFIDENCE` | No | Default `0.25` for `GET /api/map/pins` |
| `GEOTAG_POLL_MS` | No | Worker idle sleep, default `5000` |

---

## Run the geotag worker

```bash
cd backend && npm run worker:geotag
```

**Runbook:** Set `GEOTAG_ENABLED=0` to stop new jobs; inspect `videos.geotag_error` and `geotag_jobs.last_error`.

---

## HTTP API

### `GET /api/map/pins`

- Auth required. Optional bbox: `ne_lat`, `ne_lng`, `sw_lat`, `sw_lng`.
- Response: `{ pins: [{ videoId, title, thumbnail_url, lat, lng, locationId, placeLabel, confidence }] }` (max 200).

---

## Prompt versioning

- **Active prompt:** `backend/docs/geotag-prompt-v2.md` (single `place` with `latitude` / `longitude`).
- **Stored on run:** `videos.geotag_prompt_version = 'v2'`.
- **Deprecated:** `backend/docs/geotag-prompt-v1.md` (freeform + geocoder flow).

---

## Related files

- Migration: `supabase/migrations/20260329140000_geotag_pipeline.sql`
- Services: `backend/src/services/geotag/*` (no `googleGeocode.ts`)
- Worker: `backend/src/workers/geotagWorkerLoop.ts`
- Map route: `backend/src/routes/map.ts`
- Mobile: `mobile/app/(tabs)/map.tsx`, `listMapPins()`
