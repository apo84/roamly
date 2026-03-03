---
name: Roamly backend & storage architecture
overview: Design a cloud-hosted backend and storage system for Roamly, choosing between relational and NoSQL, modeling users, videos, locations, and itineraries, and defining how this backend connects to the existing React frontend.
todos:
  - id: design-schema
    content: Design detailed PostgreSQL schema for users, videos, locations, itineraries, passport entries, and supporting tables
    status: in_progress
isProject: false
---

# Roamly Backend & Storage Plan

## 1. High-level choices

- **Database type:** Use a **relational database (PostgreSQL)** rather than NoSQL.
  - **Why relational fits better:**
    - Data is highly structured and relational: users, videos, creators, locations, itineraries, passport check-ins, collections.
    - Strong need for **joins and filtering** (by city, country, category, creator, hashtags, saved status, itinerary membership).
    - MVP scale (≤100K videos, ≤10K MAU) is easily handled by a single Postgres instance; we don’t yet need sharding or a document DB.
    - Postgres gives rich types (JSONB for flexible metadata, PostGIS later for geo) plus mature indexing and transactions.
  - **NoSQL drawbacks here:**
    - Harder to express cross-entity queries (e.g., “all locations in Barcelona saved by this user that appear in at least 3 creator videos”).
    - More application-side joins and denormalization for little benefit at MVP scale.
- **Cloud choice:** Since you have **no strong preference** and want a cloud-hosted system, assume a **managed PostgreSQL** (e.g. Supabase/Neon/AWS RDS). The plan will be vendor-neutral but Postgres-specific.
- **Backend style:**
  - **Option A (recommended for MVP):** A single backend service (Node.js + TypeScript) exposing a **REST/JSON API** consumed by the existing React frontend.
  - **Option B:** GraphQL API (Apollo/Helix) for more flexible querying; can be layered later on top of the same schema.

For the AI agent, we’ll target **Option A (REST)** for clarity and speed.

---

## 2. Core domain model

### 2.1 Entities & relationships

- **User**: Authenticated app user (traveler).
- **Video**: A short-form travel video record, with references to creator, platform, and source URL(s).
- **Creator**: Social creator identity (optional for MVP; can be inlined into Video, but we’ll model it explicitly for future features).
- **Location**: Physical place (lat/lng, city, country, type) extracted from one or more videos.
- **VideoLocation**: Join linking videos ↔ locations (one video can reference multiple locations; one location appears in many videos).
- **Collection**: A user’s collection of videos (e.g. “Tokyo 2026”); can be user-owned or curated.
- **CollectionItem**: Join table linking collection ↔ video (and optionally location).
- **Itinerary**: Ordered list of stops (for a trip, dates, city).
- **ItineraryItem**: Individual stop referencing a location (and optionally a source video), with order and walking metadata.
- **PassportEntry**: Record of a user check-in at a location with optional note/photo.
- **Hashtag**: Normalized tag; **VideoHashtag** join table.

At MVP we can merge Creator into Video and skip Creator table if desired, but the plan keeps it separate for extensibility.

### 2.2 Relational schema sketch (PostgreSQL)

This is conceptual; the AI agent will translate into actual SQL migrations/ORM models.

- **users**
  - `id` (PK, UUID)
  - `email` (unique, nullable if third-party auth only)
  - `display_name`
  - `avatar_url`
  - `auth_provider` (enum: google, apple, local, etc.)
  - `created_at`, `updated_at`
- **creators**
  - `id` (PK, UUID)
  - `handle` (e.g. `travelwithsara`)
  - `platform` (enum: instagram, tiktok, youtube)
  - `display_name`
  - `avatar_url`
  - `social_url` (link to profile)
- **videos**
  - `id` (PK, UUID)
  - `external_id` (ID on platform, indexed)
  - `platform` (enum)
  - `title`
  - `caption`
  - `thumbnail_url`
  - `video_url` (or embed URL)
  - `creator_id` (FK → creators.id)
  - `like_count`, `view_count` (bigint)
  - `category` (enum: food, nightlife, attractions, nature, culture, adventure)
  - `created_at` (on platform)
  - `ingested_at` (when we stored it)
  - `raw_metadata` (JSONB for any extra fields from TikTok/Instagram APIs)
- **locations**
  - `id` (PK, UUID)
  - `name`
  - `city`
  - `country`
  - `lat` (numeric)
  - `lng` (numeric)
  - `type` (enum: restaurant, landmark, cafe, hotel, beach, park, market, etc.)
  - (Optionally) `address`, `google_place_id`, `osm_id` for future integrations.
- **video_locations** (many-to-many mapping)
  - `video_id` (FK → videos.id)
  - `location_id` (FK → locations.id)
  - Composite PK (`video_id`, `location_id`).
- **hashtags**
  - `id` (PK, UUID)
  - `tag` (text, unique, lowercase)
- **video_hashtags**
  - `video_id` (FK → videos.id)
  - `hashtag_id` (FK → hashtags.id)
  - Composite PK (`video_id`, `hashtag_id`).
- **collections**
  - `id` (PK, UUID)
  - `user_id` (FK → users.id, nullable for globally curated collections)
  - `name`
  - `cover_image_url`
  - `city`
  - `country`
  - `is_curated` (boolean)
  - `created_at`
- **collection_items**
  - `id` (PK, UUID)
  - `collection_id` (FK → collections.id)
  - `video_id` (FK → videos.id)
  - `location_id` (FK → locations.id, nullable)
  - `position` (integer for ordering)
- **itineraries**
  - `id` (PK, UUID)
  - `user_id` (FK → users.id)
  - `title`
  - `city`
  - `country`
  - `start_date`, `end_date`
  - `created_at`, `updated_at`
- **itinerary_items**
  - `id` (PK, UUID)
  - `itinerary_id` (FK → itineraries.id)
  - `location_id` (FK → locations.id)
  - `video_id` (FK → videos.id, nullable)
  - `order_index` (integer)
  - `walking_distance_meters` (integer)
  - `walking_time_minutes` (integer)
  - `checked_in` (boolean)
- **passport_entries**
  - `id` (PK, UUID)
  - `user_id` (FK → users.id)
  - `location_id` (FK → locations.id)
  - `video_id` (FK → videos.id, nullable)
  - `checked_in_at` (timestamptz)
  - `note` (text)
  - `photo_url` (nullable)
- **user_saved_videos** (optional but likely useful)
  - `user_id` (FK → users.id)
  - `video_id` (FK → videos.id)
  - `saved_at`
  - Composite PK (`user_id`, `video_id`).

Use **indexes** on common filters: `(city, country)` on `locations`, `platform, external_id` on `videos`, `user_id` on user-owned tables, etc.

---

## 3. Storage layout (cloud-hosted)

### 3.1 Database

- Use a managed Postgres instance (e.g. Supabase, Neon, or AWS RDS PostgreSQL).
- Create a single `roamly` database with:
  - `app` schema for application tables above.
  - Optional `auth` schema if using hosted auth provider that stores tokens/refresh data.
- Enable extensions as needed:
  - `uuid-ossp` or use application-generated UUIDs.
  - Later: `postgis` for advanced geo queries.

### 3.2 Blob storage for media

- Don’t store raw video files in Postgres.
- Use cloud object storage (e.g. AWS S3 or equivalent) with buckets:
  - `roamly-videos` (original or proxied video files, if we ever host copies).
  - `roamly-thumbnails` (thumbnails and any generated images).
  - `roamly-user-media` (passport photos, user-uploaded assets).
- Store only URLs and metadata (dimensions, duration) in the `videos` and `passport_entries` tables.

### 3.3 Secrets & config

- Backend service gets DB URL, storage credentials, and auth provider keys via environment variables:
  - `DATABASE_URL`, `STORAGE_BUCKET_*`, `OAUTH_GOOGLE_CLIENT_ID`, etc.
- For local development, provide `.env.example` (your repo already has [backend/.env.example](backend/.env.example) — backend plan should extend that).

---

## 4. Backend service architecture

Assuming a new `backend` service (Node.js + TypeScript) living under `/backend` (you already have [backend/README.md](backend/README.md) and [backend/docker-compose.yml](backend/docker-compose.yml); the AI agent should align with the existing structure).

### 4.1 High-level components

- **API layer**: Express/Fastify/NestJS or similar, exposing JSON REST endpoints.
- **Persistence layer**: ORM or query builder (Prisma, Drizzle, or Knex) mapping to Postgres schema.
- **Auth layer**: JWT-based session tokens or delegation to a provider (Supabase Auth, Clerk, Auth0). For the plan, assume simple JWT + social login integration later.
- **Ingestion layer** (later): Services that call TikTok/Instagram APIs or process uploaded metadata and populate `videos`, `locations`, and join tables.

### 4.2 API surface for current frontend

Define endpoints that naturally back the existing React pages (`src/pages/*.tsx`). Example (paths are illustrative):

- **Users & auth**
  - `POST /api/auth/signin` (exchange OAuth token for app JWT; or callback handler if using third-party auth).
  - `GET /api/me` (current user profile).
- **Explore / global feed**
  - `GET /api/videos` — Query params: `search`, `category`, `city`, `country`, `cursor`/`limit`.
  - `GET /api/videos/:id` — Full video details + related locations.
- **Map & locations**
  - `GET /api/locations` — Filter by `city`, `country`, `type`, `bounding_box` (for map).
  - `GET /api/locations/:id/videos` — Videos tied to a location.
- **Collections**
  - `GET /api/collections` — For current user + curated.
  - `POST /api/collections` — Create a collection.
  - `POST /api/collections/:id/items` — Add a video/location to collection.
- **Itinerary**
  - `GET /api/itineraries` – User’s itineraries.
  - `POST /api/itineraries` – Create new itinerary (city, dates).
  - `GET /api/itineraries/:id` – Details including ordered stops.
  - `POST /api/itineraries/:id/items` – Add a stop.
  - `PATCH /api/itineraries/:id/items/:itemId` – Reorder, update walking distance/time, mark checked_in.
- **Passport**
  - `GET /api/passport` – User’s passport entries.
  - `POST /api/passport` – Add check-in (location, optional video, note, photo).
- **Saved content**
  - `POST /api/videos/:id/save` / `DELETE /api/videos/:id/save` — Toggle saved state.

The AI agent should:

- Design DTOs that align with existing frontend types in [src/data/mockData.ts](src/data/mockData.ts) and [src/data/barcelonaData.ts](src/data/barcelonaData.ts).
- Gradually switch the frontend from mock data to API calls (e.g., via `react-query`).

### 4.3 Auth integration

- Start with **stateless JWT auth**:
  - `users` table stores basic profile info.
  - External identity (Google/Apple) stored via `auth_provider` + `external_id` column or a separate `user_identities` table.
- Protect write endpoints (collections, itineraries, passport, saves) with JWT.
- Read-only endpoints (explore/map) can be public or rate-limited.

---

## 5. Data ingestion & geo extraction (future-facing, but relevant)

Even if not implemented immediately, the storage design should support:

- **Video ingestion jobs** that:
  - Fetch from social APIs or receive a payload from an external worker.
  - Upsert creators and videos.
  - Create/update locations from extracted geo data, using name + city + country + lat/lng for deduplication.
  - Link via `video_locations` and `video_hashtags`.
- **Geo enrichment**:
  - Optional future use of external APIs (Google Places, OpenStreetMap) to normalize addresses and add IDs.
  - PostGIS can later power “within radius” / “bounding box” queries for map zooms.

The current schema already supports those with `raw_metadata` and flexible IDs.

---

## 6. Deployment & connectivity

### 6.1 Architecture overview

```mermaid
flowchart TD
  browser[RoamlyFrontend
  (React+Vite)] --> api[BackendAPI
  (Node+TypeScript)]
  api --> db[PostgreSQL
  (Managed)]
  api --> storage[ObjectStorage
  (video/thumbs/userMedia)]
```



- Frontend remains a static SPA (e.g. deployed via Vercel/Netlify or equivalent), configured to talk to `https://api.roamly.app`.
- Backend is a containerized Node service, deployed to a cloud runtime (e.g. AWS ECS/Fargate, Fly.io, Render); it connects to the managed Postgres instance and object storage via private network or secure credentials.

### 6.2 Local development

- Use [backend/docker-compose.yml](backend/docker-compose.yml) to bring up:
  - Postgres container.
  - Optional local object storage (e.g. MinIO) for dev.
  - Backend API container.
- Frontend (`npm run dev` in project root) talks to `http://localhost:<api_port>`.

---

## 7. Step-by-step instructions for an AI agent

1. **Inspect existing backend folder**
  - Read [backend/README.md](backend/README.md) and [backend/docker-compose.yml](backend/docker-compose.yml).
  - Align language/runtime (likely Node+TS) and container definitions with the plan above.
2. **Set up database models & migrations**
  - Choose ORM (e.g. Prisma or Drizzle).
  - Define models/tables for: `users`, `creators`, `videos`, `locations`, `video_locations`, `hashtags`, `video_hashtags`, `collections`, `collection_items`, `itineraries`, `itinerary_items`, `passport_entries`, `user_saved_videos`.
  - Generate migration SQL and apply to local Postgres (via docker-compose).
3. **Implement backend service**
  - Initialize a Node+TypeScript API project inside `/backend` if not already present.
  - Configure DB connection via `DATABASE_URL` env var.
  - Implement REST endpoints described in section 4.2, returning JSON shapes compatible with current frontend mock types.
  - Add minimal error handling and input validation (Zod or similar).
4. **Connect storage**
  - Abstract file storage via an interface that supports `upload` and `getPublicUrl`.
  - Implement an S3-compatible adapter (real S3 in production, MinIO/local for dev).
  - Use this adapter in passport photo upload (and later video ingestion).
5. **Add basic auth**
  - Implement JWT-based auth middleware.
  - Add `users` table operations (create/update profile).
  - Protect write endpoints.
6. **Wire frontend to backend**
  - In the React app, replace uses of `mockVideos`, `barcelonaVideos`, `mockItinerary`, `mockPassport` in pages like [src/pages/Explore.tsx](src/pages/Explore.tsx), [src/components/MapView.tsx](src/components/MapView.tsx), [src/pages/TripMap.tsx](src/pages/TripMap.tsx), [src/pages/Itinerary.tsx](src/pages/Itinerary.tsx), [src/pages/Passport.tsx](src/pages/Passport.tsx) with `react-query` hooks calling the new API.
  - Keep mock data as fallback fixtures for storybook/tests if desired.
7. **Testing & validation**
  - Add integration tests for key endpoints (e.g., fetch explore feed, create itinerary, add passport entry).
  - Verify that UI flows (explore, map, collections, itinerary, passport) work end-to-end against the DB.

This plan gives a relational Postgres-backed architecture that fits Roamly’s structured, geo-heavy data and MVP scale, with a clear roadmap for an AI agent (or human) to implement the cloud-hosted backend and connect it to the existing frontend.