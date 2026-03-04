const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const videoBucket = process.env.SUPABASE_VIDEO_BUCKET || "videos";

if (!supabaseUrl || !supabaseServiceKey) {
  // Fail fast so it's obvious when env is misconfigured
  // eslint-disable-next-line no-console
  console.warn(
    "[Trove API] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function getVideoUrl(storagePath) {
  if (!storagePath) {
    throw new Error("Missing storage_path for video");
  }

  // Use signed URLs so the bucket can remain private
  const { data, error } = await supabase
    .storage
    .from(videoBucket)
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  if (error || !data) {
    throw error || new Error("Could not create signed URL");
  }

  return data.signedUrl;
}

/**
 * GET /api/videos
 * Optional query params:
 *  - city: filter by locations.city
 *  - limit: max number of results (default 50)
 */
app.get("/api/videos", async (req, res) => {
  try {
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const limit = Number(req.query.limit || 50);

    let query = supabase
      .from("videos")
      .select(
        `
        id,
        title,
        description,
        platform,
        storage_path,
        thumbnail_url,
        duration_seconds,
        published_at,
        locations (
          id,
          name,
          city,
          country,
          geom
        )
      `
      )
      .order("published_at", { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 50);

    if (city) {
      query = query.eq("locations.city", city);
    }

    const { data, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all(
      (data || []).map(async (row) => ({
        ...row,
        playback_url: await getVideoUrl(row.storage_path),
      }))
    );

    res.json(enriched);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

/**
 * GET /api/videos/map
 * Query params:
 *  - xmin, ymin, xmax, ymax (WGS84 bounding box)
 * Uses a Postgres function `videos_in_bbox` if defined.
 */
app.get("/api/videos/map", async (req, res) => {
  try {
    const xmin = Number(req.query.xmin);
    const ymin = Number(req.query.ymin);
    const xmax = Number(req.query.xmax);
    const ymax = Number(req.query.ymax);

    if ([xmin, ymin, xmax, ymax].some((v) => Number.isNaN(v))) {
      return res
        .status(400)
        .json({ error: "xmin, ymin, xmax, ymax are required query params" });
    }

    const { data, error } = await supabase.rpc("videos_in_bbox", {
      xmin,
      ymin,
      xmax,
      ymax,
    });

    if (error) throw error;

    const enriched = await Promise.all(
      (data || []).map(async (row) => ({
        ...row,
        playback_url: await getVideoUrl(row.storage_path),
      }))
    );

    res.json(enriched);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Failed to fetch map videos" });
  }
});

/**
 * GET /api/videos/:id
 * Fetch a single video with its location and creator metadata.
 */
app.get("/api/videos/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const { data, error } = await supabase
      .from("videos")
      .select(
        `
        id,
        title,
        description,
        platform,
        storage_path,
        thumbnail_url,
        duration_seconds,
        published_at,
        locations (
          id,
          name,
          city,
          country,
          geom
        ),
        creators (
          id,
          username,
          avatar_url
        )
      `
      )
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") {
      // row not found
      return res.status(404).json({ error: "Video not found" });
    }

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Video not found" });
    }

    const playbackUrl = await getVideoUrl(data.storage_path);

    res.json({
      ...data,
      playback_url: playbackUrl,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Failed to fetch video" });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Trove API listening on http://localhost:${port}`);
});

