import type { Response } from "express";
import express from "express";
import { supabaseAdmin } from "../supabaseClient";
import { env } from "../config/env";
import type { AuthenticatedRequest } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

export type MapPinDto = {
  videoId: string;
  title: string;
  thumbnail_url: string | null;
  lat: number;
  lng: number;
  locationId: string;
  placeLabel: string;
  confidence: number;
};

/**
 * GET /api/map/pins
 * Auth: required.
 * Query: optional `ne_lat`, `ne_lng`, `sw_lat`, `sw_lng` to filter by bounding box.
 * Response: `{ pins: MapPinDto[] }` — max 200 pins, user's saved videos only.
 */
router.get("/map/pins", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const minConf = env.mapPinMinConfidence;

  const neLat = parseFloat(typeof req.query.ne_lat === "string" ? req.query.ne_lat : "");
  const neLng = parseFloat(typeof req.query.ne_lng === "string" ? req.query.ne_lng : "");
  const swLat = parseFloat(typeof req.query.sw_lat === "string" ? req.query.sw_lat : "");
  const swLng = parseFloat(typeof req.query.sw_lng === "string" ? req.query.sw_lng : "");
  const useBounds =
    Number.isFinite(neLat) && Number.isFinite(neLng) && Number.isFinite(swLat) && Number.isFinite(swLng);

  const { data: saves, error: saveErr } = await supabaseAdmin
    .from("user_saved_videos")
    .select("video_id")
    .eq("user_id", userId);

  if (saveErr) {
    return res.status(500).json({ error: "Failed to load saves" });
  }

  const videoIds = [...new Set((saves ?? []).map((r: { video_id: string }) => r.video_id))];
  if (!videoIds.length) {
    return res.json({ pins: [] });
  }

  const { data: vlRows, error: vlErr } = await supabaseAdmin
    .from("video_locations")
    .select("video_id, confidence, role, locations(id, name, lat, lng)")
    .in("video_id", videoIds);

  if (vlErr) {
    return res.status(500).json({ error: "Failed to load locations" });
  }

  const { data: videos, error: vErr } = await supabaseAdmin
    .from("videos")
    .select("id, title, thumbnail_url")
    .in("id", videoIds);

  if (vErr) {
    return res.status(500).json({ error: "Failed to load videos" });
  }

  const videoById: Record<string, { title: string; thumbnail_url: string | null }> = {};
  for (const v of videos ?? []) {
    const row = v as { id: string; title: string; thumbnail_url: string | null };
    videoById[row.id] = { title: row.title, thumbnail_url: row.thumbnail_url };
  }

  const pins: MapPinDto[] = [];

  for (const row of vlRows ?? []) {
    const raw = row as Record<string, unknown>;
    const video_id = raw.video_id as string;
    const confidence = raw.confidence as number | null | undefined;
    const role = typeof raw.role === "string" ? raw.role : "";
    const locJoined = raw.locations as
      | { id: string; name: string; lat: number; lng: number }
      | { id: string; name: string; lat: number; lng: number }[]
      | null
      | undefined;
    const loc = Array.isArray(locJoined) ? locJoined[0] : locJoined;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") continue;
    const conf = typeof confidence === "number" && Number.isFinite(confidence) ? confidence : 0;
    const isManual = role === "user_manual";
    if (!isManual && conf < minConf) continue;

    if (useBounds) {
      const latMin = Math.min(swLat, neLat);
      const latMax = Math.max(swLat, neLat);
      const lngMin = Math.min(swLng, neLng);
      const lngMax = Math.max(swLng, neLng);
      if (loc.lat < latMin || loc.lat > latMax || loc.lng < lngMin || loc.lng > lngMax) continue;
    }

    const v = videoById[video_id];
    if (!v) continue;

    pins.push({
      videoId: video_id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      lat: loc.lat,
      lng: loc.lng,
      locationId: loc.id,
      placeLabel: loc.name,
      confidence: conf,
    });
    if (pins.length >= 200) break;
  }

  return res.json({ pins });
});

export default router;
