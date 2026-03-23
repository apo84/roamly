import type { Response } from "express";
import express from "express";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../supabaseClient";
import type { AuthenticatedRequest } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

/** POST /api/collections – create a collection (requires auth) */
router.post("/collections", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const body = req.body as Record<string, unknown>;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const description = typeof body?.description === "string" ? body.description.trim() || null : null;
  const city = typeof body?.city === "string" ? body.city.trim() || null : null;
  const country = typeof body?.country === "string" ? body.country.trim() || null : null;
  const cover_image_url = typeof body?.cover_image_url === "string" ? body.cover_image_url.trim() || null : null;

  const now = new Date().toISOString();
  const id = randomUUID();

  const { data, error } = await supabaseAdmin
    .from("collections")
    .insert({
      id,
      user_id: userId,
      name,
      description,
      city,
      country,
      cover_image_url,
      is_curated: false,
      created_at: now,
      updated_at: now,
    })
    .select("id, user_id, name, description, city, country, cover_image_url, is_curated, created_at, updated_at")
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to create collection" });
  }

  return res.status(201).json({ collection: { ...data, item_count: 0 } });
});

/** GET /api/collections – list current user's collections, ordered by updated_at desc, with item count */
router.get("/collections", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const { data: collections, error: listError } = await supabaseAdmin
    .from("collections")
    .select("id, user_id, name, description, city, country, cover_image_url, is_curated, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (listError) {
    return res.status(500).json({ error: "Failed to load collections" });
  }

  if (!collections?.length) {
    return res.json({ collections: [] });
  }

  const ids = collections.map((c) => c.id);
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("collection_items")
    .select("collection_id")
    .in("collection_id", ids);

  const countByCollection: Record<string, number> = {};
  if (!itemsError && items) {
    for (const row of items) {
      const id = row.collection_id as string;
      countByCollection[id] = (countByCollection[id] ?? 0) + 1;
    }
  }

  const withCount = collections.map((c) => ({
    ...c,
    item_count: countByCollection[c.id] ?? 0,
  }));

  return res.json({ collections: withCount });
});

/** GET /api/collections/:id – single collection with items (videos) for current user */
router.get("/collections/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const collectionId = req.params.id as string;

  const { data: collection, error: colError } = await supabaseAdmin
    .from("collections")
    .select("id, user_id, name, description, city, country, cover_image_url, is_curated, created_at, updated_at")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .single();

  if (colError || !collection) {
    return res.status(404).json({ error: "Collection not found" });
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("collection_items")
    .select("id, video_id, position, videos(id, title, thumbnail_url, caption, video_url)")
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });

  if (itemsError) {
    return res.status(500).json({ error: "Failed to load collection items" });
  }

  const normalizedItems = (items ?? []).map((row: { id: string; video_id: string; position: number; videos: unknown }) => ({
    id: row.id,
    video_id: row.video_id,
    position: row.position,
    video: row.videos,
  }));

  return res.json({
    collection: { ...collection, item_count: normalizedItems.length },
    items: normalizedItems,
  });
});

export default router;
