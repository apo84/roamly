# Supabase migrations (Trove)

SQL migrations in this folder are intended to run against your **Supabase** Postgres project (Dashboard SQL editor or Supabase CLI).

| Migration | Purpose |
|-----------|---------|
| `20260328120000_inspiration_mvp_columns_and_rls.sql` | Travel link inspiration MVP: `user_note` / visit dates on saves & collection items, `canonical_url` on `videos`, RLS for user-scoped tables + locked-down `videos` for direct client access |
| `20260329140000_geotag_pipeline.sql` | Auto-geotag: `videos.geotag_*`, `locations` / `video_locations` provenance, `geocode_cache`, `geotag_jobs`, RLS on cache/jobs |

**Geotag keys, worker, map API:** `docs/backend/GEOTAG.md`  
**Manual checklist:** `docs/supabase/INSPIRATION_MVP_AGENT1.md`

Baseline DDL for tables not yet created lives in `backend/backend_storage_plan.md` (§ Supabase sql table creation).
