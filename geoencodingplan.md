> **Implementation in this repo:** see [`docs/backend/GEOTAG.md`](docs/backend/GEOTAG.md) (keys, worker, API) and migration [`supabase/migrations/20260329140000_geotag_pipeline.sql`](supabase/migrations/20260329140000_geotag_pipeline.sql) (run in Supabase SQL Editor or via `supabase db push`).

Here is an **agent-oriented implementation plan** for automatic geotagging (Gemini → structured place → Google Geocoding → DB) and keeping the map in sync. It is written so another agent can execute it step by step.

---

## 0. Goals and constraints

**Goal:** Whenever a **video** is ingested (or updated) on the platform, the backend derives **one or more places** from available metadata, resolves them to **lat/lng** via **Google Geocoding**, persists **`locations` + `video_locations`** (and optionally refines `collection_items`), and the **map UI** reflects new pins without a full manual workflow.

**Constraints to bake in:**

- **No silent wrong pins:** Store **confidence / source** and allow **manual override** later.
- **Cost & quotas:** Gemini + Geocoding are billed; batch, cache, and backoff.
- **Privacy / ToS:** Only send to Gemini text/metadata you are allowed to process; avoid sending raw media URLs if policy requires; prefer **caption, title, hashtags, oEmbed text** already in `videos` / `raw_metadata`.
- **Idempotency:** Re-running geotag for the same `video_id` must not create infinite duplicate locations (dedupe keys below).

**Current codebase alignment:** You already have `locations`, `video_locations`, manual attach in `PATCH /api/inspiration/:videoId`, and the Map tab loads `listInspiration({ hasLocation: true })` (list-first; comment says maps later). The plan extends the **ingestion path** and adds **map-ready APIs**.

---

## 1. Data model additions (Supabase migrations)

**Agent tasks:**

1. **`videos` table** — add nullable columns (names illustrative; adjust to your naming):
   - `geotag_status` — `enum`: `pending | processing | completed | failed | skipped | needs_review`
   - `geotag_attempted_at` — `timestamptz`
   - `geotag_completed_at` — `timestamptz`
   - `geotag_error` — `text` (last error message, truncated)
   - `geotag_model` — `text` (e.g. `gemini-2.0-flash`)
   - `geotag_raw_response` — `jsonb` **optional** (store redacted LLM output for debugging; consider retention policy)

2. **`locations` table** — ensure you can record provenance:
   - `source` — `text` or enum: `user_manual | gemini_geocoded | import | …`
   - `geocode_place_id` — `text` nullable (Google `place_id` if returned)
   - `geocode_formatted_address` — `text` nullable
   - `confidence` — `numeric(3,2)` nullable (0–1 from your pipeline)

3. **Optional join metadata** — `video_locations`:
   - `role` — `text` nullable (`primary`, `mentioned`, etc.)
   - `confidence` — numeric nullable

4. **Dedupe index** on `locations`:
   - Prefer unique partial index on `(google_place_id)` when non-null **or** `(lower(trim(name)), lower(trim(city)), lower(trim(country)), round(lat::numeric,5), round(lng::numeric,5))` — pick one strategy and document it.

5. **RLS:** If mobile reads `locations` via Supabase directly, add policies consistent with your product (e.g. only locations linked to **user’s saved videos**). Backend service role can bypass.

---

## 2. Environment and secrets (backend)

**Agent tasks:**

1. Add to `backend/src/config/env.ts` (or equivalent):
   - `GEMINI_API_KEY`
   - `GOOGLE_MAPS_GEOCODING_API_KEY` (or same GCP project with Geocoding API enabled)
   - Feature flags: `GEOTAG_ENABLED`, `GEOTAG_ON_SAVE`, `GEOTAG_ASYNC` (recommended `true` in prod)
   - Limits: `GEOTAG_MAX_CANDIDATES_PER_VIDEO`, `GEMINI_TIMEOUT_MS`, `GEOCODE_TIMEOUT_MS`, `GEOTAG_MIN_CONFIDENCE_TO_WRITE`

2. **Document** in `.env.example` (no real keys): variable names, which Google APIs to enable, and Gemini model name.

3. **Key rotation:** Never log full keys; log request ids only.

---

## 3. Gemini: input bundle and prompt contract

**Principle:** Gemini does **not** replace Geocoding; it **normalizes** messy text into **geocodable queries** and optional **structured fields**.

**Agent tasks:**

1. **Build `GeotagInput` in code** (plain object), assembled from:
   - `videos.title`, `videos.caption`, `videos.canonical_url`, platform
   - Optional: hashtag list if you have `video_hashtags` or parse from caption
   - Optional: `raw_metadata` JSON (strip PII per policy)
   - **Do not** assume frame-level vision unless you explicitly add **thumbnail URL analysis** later (separate phase; higher cost/complexity)

2. **Prompt (versioned, stored in repo as `geotag-prompt-v1.md`):**
   - System: You are a travel geolocation assistant. Output **only valid JSON** matching the schema.
   - User: Here is metadata JSON: `...`
   - **Strict JSON schema** (example):

```json
{
  "places": [
    {
      "name": "string | null",
      "neighborhood": "string | null",
      "city": "string | null",
      "region": "string | null",
      "country": "string | null",
      "freeform_query": "string",
      "confidence": 0.0,
      "reason_short": "string"
    }
  ],
  "video_level": {
    "language_hint": "string | null",
    "ambiguity": "low|medium|high"
  }
}
```

   - Rules in prompt:
     - If unsure, return **empty `places`** or **low confidence** and high `ambiguity`.
     - Prefer **one primary** place for short-form travel; allow multiple only if caption clearly mentions multiple stops.
     - `freeform_query` must be suitable for **Google Geocoding** (e.g. `"Carrer de Blai, Barcelona, Spain"`).

3. **Gemini client module** `backend/src/services/geotag/geminiGeotag.ts`:
   - Call Generative Language API (REST or official SDK).
   - Parse JSON; on parse failure → `geotag_status = failed`, log snippet (redacted).
   - Enforce **max tokens**, **timeout**, **retry with backoff** (429/5xx).

---

## 4. Google Geocoding step

**Agent tasks:**

1. Module `backend/src/services/geotag/googleGeocode.ts`:
   - Input: `freeform_query` + optional `components` (country bias via `components=country:ES` when country known).
   - Call **Geocoding API** (HTTP); parse `lat`, `lng`, `formatted_address`, `place_id`.
   - Handle `ZERO_RESULTS` → skip write or `needs_review`.
   - **Cache**: table `geocode_cache(query_hash, response_json, created_at)` **or** Redis — TTL 30–90 days to save money.

2. **Confidence fusion:**
   - `final_confidence = min(gemini_confidence, geocode_quality_score)` where `geocode_quality_score` maps from `location_type` / `partial_match` (document mapping in code comments).

3. **Threshold:** If below `GEOTAG_MIN_CONFIDENCE_TO_WRITE`, set `geotag_status = needs_review` and **do not** insert `video_locations` (or insert with a `pending` flag if you prefer UI review).

---

## 5. Persistence transaction

**Agent tasks:**

1. In `backend/src/services/geotag/persistGeotag.ts` (single DB transaction):
   - Lock or `SELECT … FOR UPDATE` on `videos` row optional (avoid duplicate workers).
   - For each accepted place:
     - **Find or create** `locations` (dedupe by `geocode_place_id` when present).
     - **Upsert** `video_locations` `(video_id, location_id)` with role/confidence.
   - Update `videos.geotag_*` fields.
   - If you want **collection_items** auto-linked: only if product says so — default **no** (avoid overwriting user intent); optional follow-up task.

2. **Idempotency key:** `video_id` + `geotag_prompt_version` — if re-run, replace previous **auto** links (delete `video_locations` where `source`/`role` indicates auto) before inserting new set.

---

## 6. When to trigger geotagging (“every video uploaded”)

**Agent tasks — pick one or combine:**

**A. Synchronous on save (dev only)**  
- In `POST /api/inspiration/save` after video insert: if `GEOTAG_ON_SAVE && !GEOTAG_ASYNC`, run pipeline (slow; risk timeouts).

**B. Async queue (recommended)**  
- After save: enqueue job `{ video_id }` (DB table `geotag_jobs` or Supabase + Edge Function + queue, or in-process BullMQ if you add Redis).
- Worker process: poll jobs, set `geotag_status = processing`, run Gemini + Geocode + persist, mark `completed/failed`.

**C. Cron / reconciliation**  
- Nightly job: `WHERE geotag_status = 'pending' OR geotag_status = 'failed' AND attempted_at < now() - interval` with max retries.

**Agent checklist:**  
- [ ] Define `geotag_jobs` table: `id`, `video_id`, `status`, `attempts`, `next_run_at`, `locked_at`  
- [ ] Worker entrypoint: `npm run worker:geotag` or same Node process with `setInterval` (document for deployment)

---

## 7. Backend HTTP API for the map (agent script)

**Agent tasks:**

1. **`GET /api/map/pins`** (or `GET /api/locations/for-user`):
   - Auth required.
   - Returns pins for **videos the user saved** (or saved + in collection — product decision) that have at least one `video_locations` row with confidence ≥ threshold.
   - Shape: `[{ videoId, title, thumbnail_url, lat, lng, locationId, placeLabel, confidence }]`

2. **`GET /api/map/bounds?ne_lat&ne_lng&sw_lat&sw_lng`** (optional v2):
   - Same as above filtered by bounding box for performance.

3. **Pagination** or **cluster** contract for scale (document max pins per response).

4. Wire **OpenAPI-style comments** in route file for the next agent.

---

## 8. Frontend / mobile map (continuous update)

**Agent tasks:**

1. **Dependencies:** `react-native-maps` (or Mapbox if you standardize later).

2. **Replace** (or augment) `mobile/app/(tabs)/map.tsx`:
   - Fetch `GET /api/map/pins` via new `listMapPins()` in `mobile/lib/api/...`.
   - Render `MapView` + `Marker` per pin; tap → bottom sheet with video thumb + title → navigate to `/(tabs)/inspiration/[id]`.

3. **“Continuously update”** — choose one:
   - **On focus:** `useFocusEffect` refetch (simplest; already pattern on Map tab).
   - **Pull-to-refresh** on map.
   - **Optional:** Supabase **Realtime** on `video_locations` / `videos` for users who saved that video (higher effort; only if needed).

4. **Types:** Extend `mobile/types/inspiration.ts` with `MapPin` type matching API.

5. **Empty states:** Copy updated from “attach manually” to “we’re inferring places automatically; you can still edit in detail.”

---

## 9. Observability, safety, and QA

**Agent tasks:**

1. Structured logs: `video_id`, `geotag_status`, durations, Gemini token usage if available, geocode `status` field.
2. Metrics counters: `geotag_success`, `geotag_failed`, `geotag_skipped`, `geocode_cache_hit`.
3. **Rate limits:** Per-user and global daily caps for Gemini/Geocode.
4. **Tests:**
   - Unit: JSON parse, geocode response mapping, dedupe logic.
   - Integration: mock Gemini + Geocode HTTP; assert DB state.
5. **Golden files:** 5–10 real-ish captions → expected `freeform_query` (snapshot tests on prompt output if you mock Gemini).

---

## 10. Rollout order (strict sequence for the agent)

1. Migrations + env + feature flags off.  
2. `geminiGeotag` + `googleGeocode` + `geocode_cache` (no DB writes except cache).  
3. `persistGeotag` + transaction + idempotent replace of auto links.  
4. Worker + job enqueue from inspiration save.  
5. `GET /api/map/pins` + mobile map UI.  
6. Enable `GEOTAG_ENABLED` in staging; tune thresholds.  
7. Production enable + monitor costs.

---

## 11. Explicit non-goals (for this phase)

- Frame-by-frame video vision geolocation (expensive; separate spec).  
- Replacing user manual override (keep PATCH flow).  
- Legal scraping of platforms beyond what you already store.

---

## 12. Handoff checklist for the executing agent

- [ ] Schema migrated; RLS reviewed.  
- [ ] Secrets in env; no keys in repo.  
- [ ] Prompt file versioned; JSON schema validated in code.  
- [ ] Geocode caching live.  
- [ ] Async worker running in deployed environment.  
- [ ] Map endpoint matches mobile types.  
- [ ] Map screen shows pins and navigates to clip.  
- [ ] Runbook: disable `GEOTAG_ENABLED`, drain queue, inspect `geotag_error`.

---

I’m in **Ask mode**, so this is planning only. If you want this implemented in-repo, switch to **Agent mode** and point the agent at this script as the source of truth.