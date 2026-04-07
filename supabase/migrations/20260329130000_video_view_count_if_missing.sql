-- Align with backend_storage_plan.md when the column was never created.
-- After applying, you may set SUPABASE_VIDEO_INCLUDE_VIEW_COUNT=1 in the Express backend .env.

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS view_count bigint NOT NULL DEFAULT 0;
