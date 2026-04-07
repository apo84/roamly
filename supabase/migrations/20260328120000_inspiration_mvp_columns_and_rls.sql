-- Inspiration MVP (Agent 1) — travel link saves + RLS for direct Supabase access
-- Prerequisites: public.users, public.videos, public.collections, public.collection_items,
--                public.user_saved_videos must already exist (see backend/backend_storage_plan.md).
-- Backend uses service_role and bypasses RLS; policies protect authenticated PostgREST / mobile direct access.

-- ---------------------------------------------------------------------------
-- 1) Column additions
-- ---------------------------------------------------------------------------

ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS user_note text,
  ADD COLUMN IF NOT EXISTS visit_start date,
  ADD COLUMN IF NOT EXISTS visit_end date;

COMMENT ON COLUMN public.collection_items.user_note IS 'Travel context: why this clip matters on this trip (per collection item).';
COMMENT ON COLUMN public.collection_items.visit_start IS 'Optional trip window start for this item.';
COMMENT ON COLUMN public.collection_items.visit_end IS 'Optional trip window end for this item.';

ALTER TABLE public.user_saved_videos
  ADD COLUMN IF NOT EXISTS user_note text;

COMMENT ON COLUMN public.user_saved_videos.user_note IS 'Library-level note when not in a collection; collection_items.user_note takes precedence in UI when both exist.';

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS canonical_url text;

COMMENT ON COLUMN public.videos.canonical_url IS 'Normalized permalink / pasted URL for dedupe and open-in-app; prefer unique when set.';

CREATE UNIQUE INDEX IF NOT EXISTS videos_canonical_url_unique
  ON public.videos (canonical_url)
  WHERE canonical_url IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_saved_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
-- videos: enable RLS with no policies for authenticated/anon => default deny.
-- Backend service_role bypasses RLS and can still read/write via Express.
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_saved_videos_own_all" ON public.user_saved_videos;
DROP POLICY IF EXISTS "collections_own_all" ON public.collections;
DROP POLICY IF EXISTS "collection_items_own_collections" ON public.collection_items;
DROP POLICY IF EXISTS "videos_no_direct_access" ON public.videos;

-- Own saves only (library)
CREATE POLICY "user_saved_videos_own_all"
  ON public.user_saved_videos
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Own collections only
CREATE POLICY "collections_own_all"
  ON public.collections
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Items only inside collections owned by the user
CREATE POLICY "collection_items_own_collections"
  ON public.collection_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  );

-- videos: do not add policies for authenticated/anon (default deny under RLS).
