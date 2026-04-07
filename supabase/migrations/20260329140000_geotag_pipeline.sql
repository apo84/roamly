-- =============================================================================
-- GEOTAG PIPELINE — run this entire file once on your Supabase Postgres project
-- =============================================================================
-- Option A: Supabase Dashboard → SQL → New query → paste → Run.
-- Option B: From repo root, with project linked: `supabase db push`
--
-- Prerequisites: `public.videos`, `public.locations`, `public.video_locations` exist
-- (see backend/backend_storage_plan.md). After this migration, set backend env vars
-- documented in docs/backend/GEOTAG.md and run `npm run worker:geotag`.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Enum: geotag_status on videos
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.geotag_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'skipped',
    'needs_review'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS geotag_status public.geotag_status,
  ADD COLUMN IF NOT EXISTS geotag_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS geotag_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS geotag_error text,
  ADD COLUMN IF NOT EXISTS geotag_model text,
  ADD COLUMN IF NOT EXISTS geotag_raw_response jsonb,
  ADD COLUMN IF NOT EXISTS geotag_prompt_version text DEFAULT 'v1';

COMMENT ON COLUMN public.videos.geotag_status IS 'Auto-geotag lifecycle; NULL = never queued (legacy rows).';
COMMENT ON COLUMN public.videos.geotag_raw_response IS 'Optional redacted Gemini JSON; trim in app or TTL via job.';

-- ---------------------------------------------------------------------------
-- 2) locations — provenance (google_place_id already exists in base schema)
-- ---------------------------------------------------------------------------
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS geocode_formatted_address text,
  ADD COLUMN IF NOT EXISTS confidence numeric(5,4);

COMMENT ON COLUMN public.locations.source IS 'e.g. user_manual | gemini_geocoded | import';
COMMENT ON COLUMN public.locations.geocode_formatted_address IS 'Google Geocoder formatted_address.';
COMMENT ON COLUMN public.locations.confidence IS 'Fused confidence 0–1 from Gemini + geocode quality.';

-- Dedupe: one row per Google place_id when present
CREATE UNIQUE INDEX IF NOT EXISTS locations_google_place_id_unique
  ON public.locations (google_place_id)
  WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> '';

-- ---------------------------------------------------------------------------
-- 3) video_locations — role, confidence, idempotent auto-geotag replacement
-- ---------------------------------------------------------------------------
ALTER TABLE public.video_locations
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS confidence numeric(5,4),
  ADD COLUMN IF NOT EXISTS auto_geotagged boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.video_locations.role IS 'e.g. auto_primary | auto_mentioned | user_manual';
COMMENT ON COLUMN public.video_locations.auto_geotagged IS 'True when link created by geotag worker; cleared false on user attach.';

-- ---------------------------------------------------------------------------
-- 4) Geocode cache (TTL enforced in application, optional cron DELETE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geocode_cache (
  query_hash text PRIMARY KEY,
  query_normalized text NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geocode_cache_created_at_idx ON public.geocode_cache (created_at);

COMMENT ON TABLE public.geocode_cache IS 'Legacy: was for Google Geocoding cache; pipeline v2 (Gemini lat/lng only) does not use this table.';

-- ---------------------------------------------------------------------------
-- 5) geotag_jobs — async queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geotag_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  next_run_at timestamptz,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geotag_jobs_pending_idx
  ON public.geotag_jobs (status, next_run_at, created_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS geotag_jobs_one_active_per_video
  ON public.geotag_jobs (video_id)
  WHERE status IN ('pending', 'processing');

COMMENT ON TABLE public.geotag_jobs IS 'Worker polls pending rows; see npm run worker:geotag.';

-- ---------------------------------------------------------------------------
-- 6) RLS — deny direct client access; backend uses service_role
-- ---------------------------------------------------------------------------
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geotag_jobs ENABLE ROW LEVEL SECURITY;

-- No policies: authenticated/anon cannot read/write (service_role bypasses RLS).
