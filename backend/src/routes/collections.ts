import type { Response } from "express";
import express from "express";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../supabaseClient";
import type { AuthenticatedRequest } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/** First non-null video thumbnail by collection, ordered by `position`. */
function firstClipThumbnailByCollection(
  rows: Array<{ collection_id: string; position: number; videos: unknown }>
): Record<string, string> {
  const byCol: Record<string, Array<{ pos: number; url: string | null }>> = {};
  for (const row of rows) {
    const v = row.videos as { thumbnail_url?: string | null } | null;
    const url = v?.thumbnail_url ?? null;
    const cid = row.collection_id;
    if (!byCol[cid]) byCol[cid] = [];
    byCol[cid].push({ pos: row.position, url });
  }
  const out: Record<string, string> = {};
  for (const cid of Object.keys(byCol)) {
    const sorted = [...byCol[cid]].sort((a, b) => a.pos - b.pos);
    const hit = sorted.find((x) => x.url);
    if (hit?.url) out[cid] = hit.url;
  }
  return out;
}

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
    .select("collection_id, position, videos(thumbnail_url)")
    .in("collection_id", ids);

  const countByCollection: Record<string, number> = {};
  if (!itemsError && items) {
    for (const row of items) {
      const id = row.collection_id as string;
      countByCollection[id] = (countByCollection[id] ?? 0) + 1;
    }
  }

  const derivedCover = !itemsError && items ? firstClipThumbnailByCollection(items) : {};

  const withCount = collections.map((c) => ({
    ...c,
    cover_image_url: c.cover_image_url ?? derivedCover[c.id] ?? null,
    item_count: countByCollection[c.id] ?? 0,
  }));

  return res.json({ collections: withCount });
});

const collectionItemSelect =
  "id, video_id, position, user_note, visit_start, visit_end, videos(id, title, thumbnail_url, caption, video_url, platform)" as const;

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
    .select(collectionItemSelect)
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });

  if (itemsError) {
    return res.status(500).json({ error: "Failed to load collection items" });
  }

  const normalizedItems = (
    items ?? []
  ).map(
    (row: {
      id: string;
      video_id: string;
      position: number;
      user_note: string | null;
      visit_start: string | null;
      visit_end: string | null;
      videos: unknown;
    }) => ({
      id: row.id,
      video_id: row.video_id,
      position: row.position,
      user_note: row.user_note,
      visit_start: row.visit_start,
      visit_end: row.visit_end,
      video: row.videos,
    }),
  );

  let cover_image_url = collection.cover_image_url;
  if (!cover_image_url) {
    for (const it of normalizedItems) {
      const vid = it.video as { thumbnail_url?: string | null } | null;
      if (vid?.thumbnail_url) {
        cover_image_url = vid.thumbnail_url;
        break;
      }
    }
  }

  return res.json({
    collection: { ...collection, cover_image_url, item_count: normalizedItems.length },
    items: normalizedItems,
  });
});

/**
 * POST /api/collections/:collectionId/items — add a saved library clip to this collection.
 * Body: { video_id: string }
 */
router.post("/collections/:collectionId/items", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const collectionId = req.params.collectionId as string;
  const body = req.body as { video_id?: string };
  const videoId = typeof body.video_id === "string" ? body.video_id.trim() : "";

  if (!isUuid(collectionId) || !isUuid(videoId)) {
    return res.status(400).json({ error: "collectionId and video_id must be UUIDs", code: "BAD_REQUEST" });
  }

  const { data: col, error: colErr } = await supabaseAdmin
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (colErr || !col) {
    return res.status(404).json({ error: "Collection not found", code: "NOT_FOUND" });
  }

  const { data: saveRow } = await supabaseAdmin
    .from("user_saved_videos")
    .select("user_id")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .maybeSingle();

  if (!saveRow) {
    return res.status(400).json({
      error: "Save this clip to your Inspo library before adding it to a collection.",
      code: "NOT_IN_LIBRARY",
    });
  }

  const { data: existingItem } = await supabaseAdmin
    .from("collection_items")
    .select("id")
    .eq("collection_id", collectionId)
    .eq("video_id", videoId)
    .maybeSingle();

  if (existingItem) {
    return res.status(409).json({
      error: "This clip is already in this collection.",
      code: "ALREADY_IN_COLLECTION",
    });
  }

  const { data: maxPosRow } = await supabaseAdmin
    .from("collection_items")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = typeof maxPosRow?.position === "number" ? maxPosRow.position + 1 : 0;
  const itemId = randomUUID();

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("collection_items")
    .insert({
      id: itemId,
      collection_id: collectionId,
      video_id: videoId,
      location_id: null,
      position,
      user_note: null,
      visit_start: null,
      visit_end: null,
    })
    .select(collectionItemSelect)
    .single();

  if (insErr || !inserted) {
    console.error("collections POST items", insErr);
    return res.status(500).json({ error: "Failed to add clip to collection", code: "SERVER_ERROR" });
  }

  const row = inserted as {
    id: string;
    video_id: string;
    position: number;
    user_note: string | null;
    visit_start: string | null;
    visit_end: string | null;
    videos: unknown;
  };

  return res.status(201).json({
    item: {
      id: row.id,
      video_id: row.video_id,
      position: row.position,
      user_note: row.user_note,
      visit_start: row.visit_start,
      visit_end: row.visit_end,
      video: row.videos,
    },
  });
});

/**
 * PATCH /api/collections/:collectionId/items/:itemId
 * Update trip context on a clip within a collection (user_note, optional visit window).
 */
router.patch("/collections/:collectionId/items/:itemId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const collectionId = req.params.collectionId as string;
  const itemId = req.params.itemId as string;

  if (!isUuid(collectionId) || !isUuid(itemId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { data: col, error: colErr } = await supabaseAdmin
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (colErr || !col) {
    return res.status(404).json({ error: "Collection not found" });
  }

  const body = req.body as Record<string, unknown>;
  const updates: Record<string, string | null> = {};

  if ("user_note" in body) {
    if (body.user_note === null) updates.user_note = null;
    else if (typeof body.user_note === "string") updates.user_note = body.user_note.trim() || null;
    else return res.status(400).json({ error: "user_note must be a string or null" });
  }
  if ("visit_start" in body) {
    const v = body.visit_start;
    if (v === null || v === "") updates.visit_start = null;
    else if (typeof v === "string") updates.visit_start = v.trim() || null;
    else return res.status(400).json({ error: "visit_start must be a string or null" });
  }
  if ("visit_end" in body) {
    const v = body.visit_end;
    if (v === null || v === "") updates.visit_end = null;
    else if (typeof v === "string") updates.visit_end = v.trim() || null;
    else return res.status(400).json({ error: "visit_end must be a string or null" });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Provide user_note, visit_start, and/or visit_end" });
  }

  const { data: updated, error: upErr } = await supabaseAdmin
    .from("collection_items")
    .update(updates)
    .eq("id", itemId)
    .eq("collection_id", collectionId)
    .select(collectionItemSelect)
    .maybeSingle();

  if (upErr) {
    return res.status(500).json({ error: "Failed to update item" });
  }
  if (!updated) {
    return res.status(404).json({ error: "Item not found in this collection" });
  }

  const row = updated as {
    id: string;
    video_id: string;
    position: number;
    user_note: string | null;
    visit_start: string | null;
    visit_end: string | null;
    videos: unknown;
  };

  return res.json({
    item: {
      id: row.id,
      video_id: row.video_id,
      position: row.position,
      user_note: row.user_note,
      visit_start: row.visit_start,
      visit_end: row.visit_end,
      video: row.videos,
    },
  });
});

export default router;
