import express from "express";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../supabaseClient";
import type { AuthenticatedRequest } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { sendInspirationError } from "../services/inspiration/errors";
import { parseHttpUrl, urlAllowed } from "../services/inspiration/allowlist";
import { resolveUrl } from "../services/inspiration/resolveUrl";
import { parseSocialUrl } from "../services/inspiration/parseSocialUrl";
import { unfurlSocial } from "../services/inspiration/unfurl";
import { decodeHtmlEntities } from "../services/inspiration/htmlEntities";
import { deriveCreatorAndCounts } from "../services/inspiration/instagramMetadata";
import { upsertCreator } from "../services/inspiration/creatorsRepo";
import { env } from "../config/env";
import { enqueueGeotagJob } from "../services/geotag/enqueueGeotagJob";
import { runGeotagForVideo } from "../services/geotag/runGeotagForVideo";

const router = express.Router();

// Branched literals for Supabase `.select()`. Optional: SUPABASE_VIDEO_INCLUDE_VIEW_COUNT, SUPABASE_VIDEO_INCLUDE_COMMENT_COUNT.
const V = (() => {
  const vc = env.videoIncludeViewCount;
  const cc = env.videoIncludeCommentCount;
  if (vc && cc) {
    return {
      collectionItemsSelect:
        "id, video_id, position, user_note, visit_start, visit_end, location_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, view_count, creator_id, comment_count)" as const,
      librarySelect:
        "saved_at, user_note, video_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, view_count, creator_id, comment_count)" as const,
      detailSelect:
        "saved_at, user_note, video_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, view_count, creator_id, comment_count, raw_metadata)" as const,
    };
  }
  if (vc) {
    return {
      collectionItemsSelect:
        "id, video_id, position, user_note, visit_start, visit_end, location_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, view_count, creator_id)" as const,
      librarySelect:
        "saved_at, user_note, video_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, view_count, creator_id)" as const,
      detailSelect:
        "saved_at, user_note, video_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, view_count, creator_id, raw_metadata)" as const,
    };
  }
  if (cc) {
    return {
      collectionItemsSelect:
        "id, video_id, position, user_note, visit_start, visit_end, location_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, creator_id, comment_count)" as const,
      librarySelect:
        "saved_at, user_note, video_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, creator_id, comment_count)" as const,
      detailSelect:
        "saved_at, user_note, video_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, creator_id, comment_count, raw_metadata)" as const,
    };
  }
  return {
    collectionItemsSelect:
      "id, video_id, position, user_note, visit_start, visit_end, location_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, creator_id)" as const,
    librarySelect:
      "saved_at, user_note, video_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, creator_id)" as const,
    detailSelect:
      "saved_at, user_note, video_id, videos(id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, creator_id, raw_metadata)" as const,
  };
})();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

async function ensurePublicUser(userId: string, email: string | null): Promise<boolean> {
  const { error } = await supabaseAdmin.from("users").upsert(
    {
      id: userId,
      email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  return !error;
}

function parseOptionalDate(s: unknown): string | null {
  if (s === undefined || s === null || s === "") return null;
  if (typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

function getUrlFromBodyOrQuery(req: express.Request): string | null {
  const q = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (q) return q;
  const body = req.body as Record<string, unknown> | undefined;
  const u = typeof body?.url === "string" ? body.url.trim() : "";
  return u || null;
}

type LocationShape = {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
};

async function loadLocationsByIds(ids: string[]): Promise<Record<string, LocationShape>> {
  if (!ids.length) return {};
  const unique = [...new Set(ids)];
  const { data } = await supabaseAdmin
    .from("locations")
    .select("id, name, city, country, lat, lng")
    .in("id", unique);

  const out: Record<string, LocationShape> = {};
  for (const row of data ?? []) {
    const r = row as LocationShape;
    out[r.id] = r;
  }
  return out;
}

async function runPreview(
  url: string,
  previewLog?: (phase: string, data?: Record<string, unknown>) => void,
): Promise<
  | { ok: true; finalUrl: string; parsed: ReturnType<typeof parseSocialUrl>; metadata: Awaited<ReturnType<typeof unfurlSocial>> }
  | { ok: false; status: number; code: string; message: string }
> {
  const initial = parseHttpUrl(url);
  if (!initial || !urlAllowed(url)) {
    previewLog?.("preview_blocked", { reason: "URL_NOT_ALLOWED" });
    return { ok: false, status: 400, code: "URL_NOT_ALLOWED", message: "URL host is not allowed" };
  }

  let finalUrl: string;
  let response: Response;
  try {
    previewLog?.("resolveUrl_start", { host: initial.hostname });
    const tResolve = Date.now();
    const resolved = await resolveUrl(url);
    previewLog?.("resolveUrl_done", { ms: Date.now() - tResolve, finalHost: new URL(resolved.finalUrl).hostname });
    finalUrl = resolved.finalUrl;
    response = resolved.response;
  } catch (e) {
    const msg = e instanceof Error && e.message === "URL_NOT_ALLOWED" ? "Redirect left allowlisted hosts" : "Failed to resolve URL";
    const code = e instanceof Error && e.message === "URL_NOT_ALLOWED" ? "URL_NOT_ALLOWED" : "INVALID_URL";
    previewLog?.("resolveUrl_error", { code, message: e instanceof Error ? e.message : String(e) });
    return { ok: false, status: 400, code, message: msg };
  }

  const parsed = parseSocialUrl(finalUrl);
  if (!parsed) {
    previewLog?.("parseSocial_failed", { finalUrl: finalUrl.slice(0, 120) });
    return {
      ok: false,
      status: 400,
      code: "INVALID_URL",
      message: "Could not parse a supported Instagram, TikTok, or YouTube link",
    };
  }

  let metadata: Awaited<ReturnType<typeof unfurlSocial>> = {};
  try {
    previewLog?.("unfurl_start", { platform: parsed.platform });
    const tUnfurl = Date.now();
    metadata = await unfurlSocial(parsed.platform, finalUrl, response);
    previewLog?.("unfurl_done", {
      ms: Date.now() - tUnfurl,
      hasTitle: Boolean(metadata.title),
      hasThumb: Boolean(metadata.thumbnailUrl),
    });
  } catch (err) {
    previewLog?.("unfurl_error", { message: err instanceof Error ? err.message : String(err) });
    metadata = {};
  }

  return { ok: true, finalUrl, parsed, metadata };
}

/** GET /api/inspiration/unfurl?url= — metadata only, no persistence */
router.get("/inspiration/unfurl", requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!url) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "Query parameter url is required");
  }

  const result = await runPreview(url);
  if (!result.ok) {
    return sendInspirationError(res, result.status as 400, result.code as "INVALID_URL", result.message);
  }

  return res.json({
    finalUrl: result.finalUrl,
    platform: result.parsed!.platform,
    externalId: result.parsed!.externalId,
    canonicalUrl: result.parsed!.canonicalUrl,
    title: result.metadata.title,
    description: result.metadata.description,
    thumbnailUrl: result.metadata.thumbnailUrl,
    author: result.metadata.author,
  });
});

/** POST /api/inspiration/parse — same as unfurl; body { url } */
router.post("/inspiration/parse", requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const url = getUrlFromBodyOrQuery(req);
  if (!url) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "Body field url is required");
  }

  const result = await runPreview(url);
  if (!result.ok) {
    return sendInspirationError(res, result.status as 400, result.code as "INVALID_URL", result.message);
  }

  return res.json({
    finalUrl: result.finalUrl,
    platform: result.parsed!.platform,
    externalId: result.parsed!.externalId,
    canonicalUrl: result.parsed!.canonicalUrl,
    title: result.metadata.title,
    description: result.metadata.description,
    thumbnailUrl: result.metadata.thumbnailUrl,
    author: result.metadata.author,
  });
});

/** POST /api/inspiration/save */
router.post("/inspiration/save", requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const rid = randomUUID().slice(0, 8);
  const t0 = Date.now();
  const saveLog = (phase: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "production" && process.env.DEBUG_INSPIRATION_SAVE !== "1") return;
    const payload = data && Object.keys(data).length ? JSON.stringify(data) : "";
    console.log(`[inspiration/save ${rid}] +${Date.now() - t0}ms`, phase, payload);
  };

  const userId = req.user!.id;
  const email = req.user!.email ?? null;
  const body = req.body as Record<string, unknown>;

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "Field url is required");
  }

  saveLog("request", { urlLength: url.length, hasCollectionId: typeof body?.collectionId === "string" });

  const note = typeof body?.note === "string" ? body.note.trim() || null : null;
  const collectionId = typeof body?.collectionId === "string" ? body.collectionId.trim() : null;
  const visitStart = parseOptionalDate(body?.visitStart);
  const visitEnd = parseOptionalDate(body?.visitEnd);

  if (body?.visitStart !== undefined && body.visitStart !== null && body.visitStart !== "" && !visitStart) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "visitStart must be YYYY-MM-DD");
  }
  if (body?.visitEnd !== undefined && body.visitEnd !== null && body.visitEnd !== "" && !visitEnd) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "visitEnd must be YYYY-MM-DD");
  }

  if (!(await ensurePublicUser(userId, email))) {
    saveLog("ensure_user_failed");
    return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to sync user profile");
  }
  saveLog("ensure_user_ok");

  const preview = await runPreview(url, (phase, data) => saveLog(`preview_${phase}`, data));
  if (!preview.ok) {
    saveLog("preview_failed", { code: preview.code, message: preview.message });
    return sendInspirationError(res, preview.status as 400, preview.code as "INVALID_URL", preview.message);
  }

  const { finalUrl, parsed, metadata } = preview;
  saveLog("preview_ok", { platform: parsed!.platform, externalId: parsed!.externalId });

  const fallbackTitle = `${parsed!.platform.charAt(0).toUpperCase() + parsed!.platform.slice(1)} ${parsed!.externalId}`;
  const igDerived = deriveCreatorAndCounts(parsed!.platform, metadata, fallbackTitle);

  let videoTitle: string;
  let videoCaption: string | null;
  let likeCount: number;
  let commentCount: number;
  let creatorId: string | null = null;

  if (igDerived) {
    videoTitle = igDerived.videoTitle;
    videoCaption = igDerived.videoCaption;
    likeCount = igDerived.likeCount;
    commentCount = igDerived.commentCount;
    if (igDerived.handle) {
      creatorId = await upsertCreator(supabaseAdmin, parsed!.platform, igDerived.handle, {
        displayName: igDerived.displayName,
      });
      saveLog("creator_upsert", { creatorId: creatorId?.slice(0, 8), handle: igDerived.handle });
    }
  } else {
    videoTitle = decodeHtmlEntities(metadata.title?.trim() || fallbackTitle).slice(0, 500) || fallbackTitle;
    videoCaption = metadata.description
      ? decodeHtmlEntities(metadata.description).slice(0, 8000)
      : null;
    likeCount = 0;
    commentCount = 0;
  }

  const now = new Date().toISOString();
  const rawMetadata = {
    unfurl: metadata,
    source: "inspiration_save",
    ...(igDerived
      ? {
          parsed: {
            instagram: {
              handle: igDerived.handle,
              displayName: igDerived.displayName,
              likeCount: igDerived.likeCount,
              commentCount: igDerived.commentCount,
            },
          },
        }
      : {}),
  };

  const { data: existingVideo } = await supabaseAdmin
    .from("videos")
    .select("id")
    .eq("platform", parsed!.platform)
    .eq("external_id", parsed!.externalId)
    .maybeSingle();

  const commentCountPayload = env.videoIncludeCommentCount ? { comment_count: commentCount } : {};
  const viewCountPayload = env.videoIncludeViewCount ? { view_count: 0 } : {};

  const saveVideoSelect = (() => {
    const vc = env.videoIncludeViewCount;
    const cc = env.videoIncludeCommentCount;
    if (vc && cc) {
      return "id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, view_count, creator_id, comment_count" as const;
    }
    if (vc) {
      return "id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, view_count, creator_id" as const;
    }
    if (cc) {
      return "id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, creator_id, comment_count" as const;
    }
    return "id, external_id, platform, title, caption, thumbnail_url, video_url, canonical_url, created_at, ingested_at, like_count, creator_id" as const;
  })();

  const videoWriteBase = {
    title: videoTitle,
    caption: videoCaption,
    thumbnail_url: metadata.thumbnailUrl ?? null,
    video_url: finalUrl,
    canonical_url: parsed!.canonicalUrl,
    creator_id: creatorId,
    like_count: likeCount,
    ...commentCountPayload,
    ingested_at: now,
    raw_metadata: rawMetadata,
  };

  let video: Record<string, unknown>;
  if (existingVideo?.id) {
    const q = supabaseAdmin.from("videos").update(videoWriteBase).eq("id", existingVideo.id);
    const { data: updated, error: videoError } = await q.select(saveVideoSelect).single();

    if (videoError || !updated) {
      console.error("inspiration save video update", videoError);
      saveLog("video_update_failed", { error: videoError?.message });
      return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to save video metadata");
    }
    video = updated as unknown as Record<string, unknown>;
    saveLog("video_updated", { videoId: existingVideo.id });
  } else {
    const newId = randomUUID();
    const q = supabaseAdmin.from("videos").insert({
      id: newId,
      external_id: parsed!.externalId,
      platform: parsed!.platform,
      ...videoWriteBase,
      ...viewCountPayload,
      category: null,
      created_at: now,
    });
    const { data: inserted, error: videoError } = await q.select(saveVideoSelect).single();

    if (videoError || !inserted) {
      console.error("inspiration save video insert", videoError);
      saveLog("video_insert_failed", { error: videoError?.message, code: videoError?.code });
      return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to save video metadata");
    }
    video = inserted as unknown as Record<string, unknown>;
    saveLog("video_inserted", { videoId: (video as { id: string }).id });
  }

  const resolvedVideoId = video.id as string;

  const { data: existingSave } = await supabaseAdmin
    .from("user_saved_videos")
    .select("user_id")
    .eq("user_id", userId)
    .eq("video_id", resolvedVideoId)
    .maybeSingle();

  if (existingSave) {
    saveLog("duplicate_save", { videoId: resolvedVideoId });
    return sendInspirationError(res, 409, "DUPLICATE_SAVE", "This link is already in your library");
  }

  const { data: savedLink, error: saveError } = await supabaseAdmin
    .from("user_saved_videos")
    .insert({
      user_id: userId,
      video_id: resolvedVideoId,
      user_note: note,
      saved_at: now,
    })
    .select("user_id, video_id, saved_at, user_note")
    .single();

  if (saveError || !savedLink) {
    console.error("inspiration save user_saved_videos", saveError);
    saveLog("user_saved_insert_failed", { error: saveError?.message, code: saveError?.code });
    return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to save to library");
  }
  saveLog("user_saved_ok", { videoId: resolvedVideoId });

  let collectionItem: Record<string, unknown> | null = null;

  if (collectionId) {
    if (!isUuid(collectionId)) {
      return sendInspirationError(res, 400, "BAD_REQUEST", "collectionId must be a UUID");
    }

    const { data: col, error: colErr } = await supabaseAdmin
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (colErr || !col) {
      return sendInspirationError(res, 404, "COLLECTION_NOT_FOUND", "Collection not found");
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

    const { data: item, error: itemErr } = await supabaseAdmin
      .from("collection_items")
      .insert({
        id: itemId,
        collection_id: collectionId,
        video_id: resolvedVideoId,
        location_id: null,
        position,
        user_note: note,
        visit_start: visitStart,
        visit_end: visitEnd,
      })
      .select("id, collection_id, video_id, position, user_note, visit_start, visit_end, location_id")
      .single();

    if (itemErr || !item) {
      console.error("inspiration save collection_items", itemErr);
      saveLog("collection_item_failed", { error: itemErr?.message });
      return sendInspirationError(res, 500, "BAD_REQUEST", "Saved to library but failed to add to collection");
    }

    collectionItem = item as Record<string, unknown>;
    saveLog("collection_item_ok", { collectionId });
  }

  saveLog("response_201");

  if (env.geotagEnabled) {
    if (env.geotagAsync) {
      void enqueueGeotagJob(supabaseAdmin, resolvedVideoId).catch((err) =>
        console.warn("[inspiration/save] geotag enqueue", err),
      );
    } else if (env.geotagOnSave) {
      try {
        await runGeotagForVideo(resolvedVideoId);
      } catch (geErr) {
        console.warn("[inspiration/save] inline geotag failed", geErr);
      }
    }
  }

  return res.status(201).json({
    video,
    savedLink,
    collectionItem,
  });
});

/** GET /api/inspiration?collectionId=&hasLocation= */
router.get("/inspiration", requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const userId = req.user!.id;
  const collectionId = typeof req.query.collectionId === "string" ? req.query.collectionId.trim() : "";
  const hasLocation =
    req.query.hasLocation === "true" || req.query.hasLocation === "1";

  if (collectionId && !isUuid(collectionId)) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "collectionId must be a UUID");
  }

  if (collectionId) {
    const { data: col, error: colErr } = await supabaseAdmin
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (colErr || !col) {
      return sendInspirationError(res, 404, "COLLECTION_NOT_FOUND", "Collection not found");
    }

    let query = supabaseAdmin.from("collection_items").select(V.collectionItemsSelect)
      .eq("collection_id", collectionId)
      .order("position", { ascending: true });

    if (hasLocation) {
      query = query.not("location_id", "is", null);
    }

    const { data: rows, error } = await query;

    if (error) {
      return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to load collection items");
    }

    const videoIds = (rows ?? []).map((r: { video_id: string }) => r.video_id);
    const libNotes = await loadLibraryNotes(userId, videoIds);
    const locationIds = (rows ?? [])
      .map((r: { location_id: string | null }) => r.location_id)
      .filter((id): id is string => !!id);
    const locationsById = await loadLocationsByIds(locationIds);

    const items = (rows ?? []).map((row: Record<string, unknown>) => {
      const meta = libNotes[row.video_id as string];
      const locId = row.location_id as string | null;
      return {
        video: row.videos,
        libraryNote: meta?.userNote ?? null,
        savedAt: meta?.savedAt ?? null,
        collectionItem: {
          id: row.id,
          position: row.position,
          userNote: row.user_note,
          visitStart: row.visit_start,
          visitEnd: row.visit_end,
          locationId: locId,
          location: locId ? locationsById[locId] ?? null : null,
        },
      };
    });

    return res.json({ items });
  }

  let locatedVideoIds: string[] | null = null;
  let locationByVideoId: Record<string, LocationShape> = {};
  if (hasLocation) {
    const { data: cols } = await supabaseAdmin.from("collections").select("id").eq("user_id", userId);
    const colIds = (cols ?? []).map((c: { id: string }) => c.id);
    if (!colIds.length) {
      return res.json({ items: [] });
    }
    const { data: located } = await supabaseAdmin
      .from("collection_items")
      .select("video_id, location_id")
      .in("collection_id", colIds)
      .not("location_id", "is", null);

    locatedVideoIds = [...new Set((located ?? []).map((r: { video_id: string }) => r.video_id))];
    if (!locatedVideoIds.length) {
      return res.json({ items: [] });
    }
    const locIds = (located ?? [])
      .map((r: { location_id: string | null }) => r.location_id)
      .filter((id): id is string => !!id);
    const locById = await loadLocationsByIds(locIds);
    locationByVideoId = {};
    for (const row of located ?? []) {
      const r = row as { video_id: string; location_id: string };
      if (!locationByVideoId[r.video_id] && locById[r.location_id]) {
        locationByVideoId[r.video_id] = locById[r.location_id];
      }
    }
  }

  let libQuery = supabaseAdmin.from("user_saved_videos").select(V.librarySelect)
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (locatedVideoIds) {
    libQuery = libQuery.in("video_id", locatedVideoIds);
  }

  const { data: saves, error: libErr } = await libQuery;

  if (libErr) {
    console.error("[inspiration] GET /inspiration library query failed:", libErr.message, libErr.code, libErr.details);
    return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to load library");
  }

  const items = (saves ?? []).map((row: Record<string, unknown>) => ({
    video: row.videos,
    libraryNote: row.user_note,
    savedAt: row.saved_at,
    collectionItem: hasLocation
      ? {
          locationId: (locationByVideoId[row.video_id as string]?.id ?? null) as string | null,
          location: locationByVideoId[row.video_id as string] ?? null,
        }
      : null,
  }));

  return res.json({ items });
});

async function loadLibraryNotes(
  userId: string,
  videoIds: string[],
): Promise<Record<string, { userNote: string | null; savedAt: string }>> {
  if (!videoIds.length) return {};
  const { data } = await supabaseAdmin
    .from("user_saved_videos")
    .select("video_id, user_note, saved_at")
    .eq("user_id", userId)
    .in("video_id", videoIds);

  const out: Record<string, { userNote: string | null; savedAt: string }> = {};
  for (const row of data ?? []) {
    const r = row as { video_id: string; user_note: string | null; saved_at: string };
    out[r.video_id] = { userNote: r.user_note, savedAt: r.saved_at };
  }
  return out;
}

/** GET /api/inspiration/:videoId */
router.get("/inspiration/:videoId", requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const userId = req.user!.id;
  const videoId = req.params.videoId as string;

  if (!isUuid(videoId)) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "Invalid video id");
  }

  const { data, error } = await supabaseAdmin.from("user_saved_videos").select(V.detailSelect)
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .maybeSingle();

  if (error) {
    return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to load save");
  }
  if (!data) {
    return sendInspirationError(res, 404, "NOT_FOUND", "Saved item not found");
  }

  const row = data as Record<string, unknown>;
  const { data: ownedCollections } = await supabaseAdmin.from("collections").select("id").eq("user_id", userId);
  const ownedCollectionIds = (ownedCollections ?? []).map((c: { id: string }) => c.id);

  let collectionItems: Record<string, unknown>[] = [];
  if (ownedCollectionIds.length) {
    const { data: rows } = await supabaseAdmin
      .from("collection_items")
      .select("id, collection_id, position, user_note, visit_start, visit_end, location_id")
      .eq("video_id", videoId)
      .in("collection_id", ownedCollectionIds)
      .order("position", { ascending: true });
    collectionItems = (rows ?? []) as Record<string, unknown>[];
  }

  const locationIds = collectionItems
    .map((i) => (i.location_id as string | null) ?? null)
    .filter((id): id is string => !!id);
  const locationById = await loadLocationsByIds(locationIds);
  const normalizedCollectionItems = collectionItems.map((it: Record<string, unknown>) => {
    const locId = it.location_id as string | null;
    return {
      id: it.id,
      collectionId: it.collection_id,
      position: it.position,
      userNote: it.user_note,
      visitStart: it.visit_start,
      visitEnd: it.visit_end,
      locationId: locId,
      location: locId ? locationById[locId] ?? null : null,
    };
  });

  return res.json({
    video: row.videos,
    savedLink: {
      savedAt: row.saved_at,
      userNote: row.user_note,
      videoId: row.video_id,
    },
    collectionItems: normalizedCollectionItems,
  });
});

/** PATCH /api/inspiration/:videoId — update library note and/or place attach */
router.patch("/inspiration/:videoId", requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const userId = req.user!.id;
  const videoId = req.params.videoId as string;

  if (!isUuid(videoId)) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "Invalid video id");
  }

  const body = req.body as Record<string, unknown>;
  const hasNote = "note" in body;
  const hasLocationId = "locationId" in body;
  const hasPlacePayload = "placeLabel" in body || "lat" in body || "lng" in body;
  if (!hasNote && !hasLocationId && !hasPlacePayload) {
    return sendInspirationError(
      res,
      400,
      "BAD_REQUEST",
      "Provide at least one of note, locationId, or placeLabel/lat/lng",
    );
  }
  const note = hasNote ? (typeof body.note === "string" ? body.note.trim() || null : null) : undefined;
  const collectionId = typeof body.collectionId === "string" ? body.collectionId.trim() : "";
  if (collectionId && !isUuid(collectionId)) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "collectionId must be a UUID");
  }

  let updatedSave: Record<string, unknown> | null = null;
  if (hasNote) {
    const { data, error } = await supabaseAdmin
      .from("user_saved_videos")
      .update({ user_note: note })
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .select("user_id, video_id, saved_at, user_note")
      .maybeSingle();

    if (error) {
      return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to update note");
    }
    if (!data) {
      return sendInspirationError(res, 404, "NOT_FOUND", "Saved item not found");
    }
    updatedSave = data as Record<string, unknown>;
  }

  let updatedCollectionItem: Record<string, unknown> | null = null;
  let attachedLocation: LocationShape | null = null;

  if (hasLocationId || hasPlacePayload) {
    let targetCollectionId = collectionId;
    if (!targetCollectionId) {
      const { data: ownedCollections } = await supabaseAdmin.from("collections").select("id").eq("user_id", userId);
      const ownedIds = (ownedCollections ?? []).map((c: { id: string }) => c.id);
      const { data: firstItem } = await supabaseAdmin
        .from("collection_items")
        .select("collection_id")
        .eq("video_id", videoId)
        .in("collection_id", ownedIds)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      targetCollectionId = (firstItem?.collection_id as string | undefined) ?? "";
    }

    if (!targetCollectionId) {
      return sendInspirationError(
        res,
        400,
        "BAD_REQUEST",
        "Attach this save to a collection before setting a place, or provide collectionId.",
      );
    }

    let locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
    if (locationId) {
      if (!isUuid(locationId)) {
        return sendInspirationError(res, 400, "BAD_REQUEST", "locationId must be a UUID");
      }
      const { data: existingLoc } = await supabaseAdmin
        .from("locations")
        .select("id, name, city, country, lat, lng")
        .eq("id", locationId)
        .maybeSingle();
      if (!existingLoc) {
        return sendInspirationError(res, 404, "NOT_FOUND", "Location not found");
      }
      attachedLocation = existingLoc as LocationShape;
    } else {
      const placeLabel = typeof body.placeLabel === "string" ? body.placeLabel.trim() : "";
      const lat = typeof body.lat === "number" ? body.lat : Number.NaN;
      const lng = typeof body.lng === "number" ? body.lng : Number.NaN;
      if (!placeLabel || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return sendInspirationError(
          res,
          400,
          "BAD_REQUEST",
          "placeLabel, lat, and lng are required when locationId is not provided",
        );
      }
      locationId = randomUUID();
      const city = typeof body.placeCity === "string" ? body.placeCity.trim() || "Unknown" : "Unknown";
      const country = typeof body.placeCountry === "string" ? body.placeCountry.trim() || "Unknown" : "Unknown";
      const { data: insertedLoc, error: locError } = await supabaseAdmin
        .from("locations")
        .insert({
          id: locationId,
          name: placeLabel,
          city,
          country,
          lat,
          lng,
          type: null,
          address: null,
          google_place_id: null,
          osm_id: null,
        })
        .select("id, name, city, country, lat, lng")
        .single();
      if (locError || !insertedLoc) {
        return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to create location");
      }
      attachedLocation = insertedLoc as LocationShape;
    }

    await supabaseAdmin.from("video_locations").upsert(
      {
        video_id: videoId,
        location_id: locationId,
        auto_geotagged: false,
        role: "user_manual",
        confidence: 1,
      },
      { onConflict: "video_id,location_id" },
    );

    const { data: updatedItem, error: updateItemError } = await supabaseAdmin
      .from("collection_items")
      .update({ location_id: locationId })
      .eq("video_id", videoId)
      .eq("collection_id", targetCollectionId)
      .select("id, collection_id, video_id, position, user_note, visit_start, visit_end, location_id")
      .maybeSingle();

    if (updateItemError || !updatedItem) {
      return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to attach location to collection item");
    }
    updatedCollectionItem = updatedItem as Record<string, unknown>;
  }
  if (!updatedSave) {
    const { data: existingSave } = await supabaseAdmin
      .from("user_saved_videos")
      .select("user_id, video_id, saved_at, user_note")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .maybeSingle();
    if (!existingSave) {
      return sendInspirationError(res, 404, "NOT_FOUND", "Saved item not found");
    }
    updatedSave = existingSave as Record<string, unknown>;
  }

  return res.json({
    savedLink: updatedSave,
    collectionItem: updatedCollectionItem
      ? {
          ...updatedCollectionItem,
          location: attachedLocation,
        }
      : null,
  });
});

/** DELETE /api/inspiration/:videoId — remove from library (collection rows unchanged) */
router.delete("/inspiration/:videoId", requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const userId = req.user!.id;
  const videoId = req.params.videoId as string;

  if (!isUuid(videoId)) {
    return sendInspirationError(res, 400, "BAD_REQUEST", "Invalid video id");
  }

  const { data: removed, error } = await supabaseAdmin
    .from("user_saved_videos")
    .delete()
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    return sendInspirationError(res, 500, "BAD_REQUEST", "Failed to remove save");
  }
  if (!removed) {
    return sendInspirationError(res, 404, "NOT_FOUND", "Saved item not found");
  }

  return res.status(204).send();
});

export default router;
