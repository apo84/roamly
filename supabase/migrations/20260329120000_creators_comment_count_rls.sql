-- Creators table + video.comment_count + RLS on creators (service role only for writes).
-- Matches backend/backend_storage_plan.md; safe if creators already exists from manual DDL.

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS comment_count bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.videos.comment_count IS 'Platform comment count when available (e.g. Instagram og:description).';

CREATE TABLE IF NOT EXISTS public.creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  display_name text,
  avatar_url text,
  social_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS creators_platform_handle_uniq ON public.creators (platform, handle);

COMMENT ON TABLE public.creators IS 'Social creators; populated by Express ingestion. No PostgREST policies — default deny under RLS.';

ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
