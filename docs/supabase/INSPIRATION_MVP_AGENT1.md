# Agent 1 — Supabase: inspiration MVP (what you do manually)

This doc matches migration `supabase/migrations/20260328120000_inspiration_mvp_columns_and_rls.sql`.

## 1. Confirm base tables exist

In **Supabase → Table Editor**, verify you already have:

- `public.users`
- `public.videos`
- `public.collections`
- `public.collection_items`
- `public.user_saved_videos`

If any are missing, run your baseline DDL first (e.g. from `backend/backend_storage_plan.md` § “Supabase sql table creation”) **before** this migration.

Your live `collections` table may include extra columns (`description`, `updated_at`) used by Express — that is fine; this migration only **adds** columns elsewhere.

## 2. Apply the migration

**Option A — Supabase SQL Editor**

1. Open **Supabase Dashboard → SQL → New query**.
2. Paste the full contents of  
   `supabase/migrations/20260328120000_inspiration_mvp_columns_and_rls.sql`.
3. Run once.

**Option B — Supabase CLI** (if linked)

```bash
supabase db push
# or
supabase migration up
```

## 3. Verify

Run in SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'collection_items'
  AND column_name IN ('user_note', 'visit_start', 'visit_end');

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_saved_videos' AND column_name = 'user_note';

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'videos' AND column_name = 'canonical_url';
```

Check RLS:

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_saved_videos', 'collections', 'collection_items', 'videos');
```

`rowsecurity` should be `true` for all four.

## 4. Behavior notes (Track B — Express)

- **Service role** (`SUPABASE_SERVICE_ROLE_KEY` on the backend) **bypasses RLS**. Your Express routes can still insert/update `videos`, `user_saved_videos`, and `collection_items`.
- **Authenticated** users using the **Supabase JS client with the anon key** against PostgREST:
  - Can read/write **their** `user_saved_videos`, `collections`, `collection_items`.
  - **Cannot** read or write `videos`: RLS is **on** with **no** policies for those roles → PostgreSQL default deny. Ingest must go through the API with the **service role**.

## 5. Note precedence (product)

- **Collection context:** use `collection_items.user_note` (+ `visit_start` / `visit_end`) when the item is on a trip list.
- **Library-only:** use `user_saved_videos.user_note` when showing the global saved list without a collection row.

## 6. If something fails

| Error | Likely cause |
|--------|----------------|
| `relation "public.collection_items" does not exist` | Base schema not applied |
| `policy already exists` | You ran the migration twice; policies use `DROP POLICY IF EXISTS` — use latest file |
| Backend 500 on collections after RLS | Backend must use **service role**, not anon key |

## 7. Optional: `anon` role

This migration does **not** grant `anon` access to these tables. Mobile MVP should use **Bearer token → Express API**. If you later allow direct Supabase from the app, add narrow `anon` policies (not recommended for `videos` writes).
