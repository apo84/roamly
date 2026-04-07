# Inspiration MVP — Agents 4 to 8

This document summarizes what shipped after Agent 3 for mobile and backend support.

## Agent 4 — Add link flow

- Screen: `mobile/app/(tabs)/inspiration/add.tsx`
- Features:
  - URL input + multiline note.
  - Optional collection selection (chips) loaded from `GET /api/collections`.
  - Optional visit start/end date fields (`YYYY-MM-DD`).
  - Save action calls `POST /api/inspiration/save`.
  - Optional "Open in app" action using `Linking.openURL(video.video_url || video.canonical_url)`.

## Agent 5 — Mobile API client + types

- Types: `mobile/types/inspiration.ts`
- API module: `mobile/lib/api/inspiration.ts`
- Shared behavior:
  - Reads `EXPO_PUBLIC_API_URL`.
  - Uses Supabase mobile session access token (`Authorization: Bearer <token>`).
  - Standardized `ApiError` class for UI-level error handling.
- Functions:
  - `listCollections()`
  - `saveInspiration()`
  - `listInspiration()`
  - `getInspiration()`
  - `patchInspiration()`
  - `removeInspiration()`

## Agent 6 — Library list + detail

- Library: `mobile/app/(tabs)/inspiration/index.tsx`
  - API-backed `FlatList`.
  - Pull-to-refresh.
  - Thumbnail + platform badge + first-note line.
  - Tap row → detail route.
- Detail: `mobile/app/(tabs)/inspiration/[id].tsx`
  - Loads `GET /api/inspiration/:videoId`.
  - Shows note and collection item metadata (visit dates + location when available).
  - Open original URL.
  - Delete save via `DELETE /api/inspiration/:videoId`.

## Agent 7 — Map tab

- Screen: `mobile/app/(tabs)/map.tsx`
- MVP decision: **list-only map feed** (no map SDK dependency added).
- Data source: `GET /api/inspiration?hasLocation=true`.
- Behavior:
  - Signed-out users get a sign-in prompt.
  - Signed-in users see only items with location attached.
  - Empty state: "Add a place to see pins".

## Agent 8 — Place attach (optional MVP slice, shipped)

- UI: detail screen includes manual place form (`placeLabel`, `lat`, `lng`).
- API call: `PATCH /api/inspiration/:videoId`.
- Backend support in `backend/src/routes/inspiration.ts`:
  - Accepts `locationId` OR manual `placeLabel/lat/lng` (+ optional `placeCity/placeCountry`).
  - Creates `locations` row when needed.
  - Updates `collection_items.location_id` for the selected/first owned collection item.
  - Upserts `video_locations` relation.

## Environment notes (mobile)

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` **must be Express API origin** (`http://localhost:4000`, `http://10.0.2.2:4000`, or LAN IP for physical device).
- Do not use `exp://...` as API URL.

## Limitations / follow-ups

- Place attach requires a collection item for the video. If none exists, backend returns a clear error asking to attach to a collection first.
- Map tab is intentionally list-only until a map package is chosen.
