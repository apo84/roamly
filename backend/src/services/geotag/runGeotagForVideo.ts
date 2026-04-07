import { env } from "../../config/env";
import { supabaseAdmin } from "../../supabaseClient";
import { buildGeotagInput } from "./buildGeotagInput";
import { applyAmbiguityPenalty } from "./coords";
import { deleteAutoGeotagLinks, findOrCreateLocationFromGeminiCoords, insertVideoLocation } from "./persistGeotag";
import { runGeminiGeotag } from "./geminiGeotag";

const PROMPT_VERSION = "v2";

function truncateErr(msg: string, max = 500): string {
  return msg.length <= max ? msg : msg.slice(0, max);
}

/**
 * Full pipeline for one video: load row → Gemini (lat/lng) → persist → update video columns.
 */
export async function runGeotagForVideo(videoId: string): Promise<void> {
  const started = Date.now();
  if (!env.geminiApiKey) {
    console.warn("[geotag] skip: missing GEMINI_API_KEY");
    await supabaseAdmin
      .from("videos")
      .update({
        geotag_status: "skipped",
        geotag_error: "Missing GEMINI_API_KEY",
        geotag_attempted_at: new Date().toISOString(),
      })
      .eq("id", videoId);
    return;
  }

  const { data: row, error: loadErr } = await supabaseAdmin
    .from("videos")
    .select("id, title, caption, platform, canonical_url, raw_metadata")
    .eq("id", videoId)
    .maybeSingle();

  if (loadErr || !row) {
    console.error("[geotag] video not found", videoId, loadErr?.message);
    return;
  }

  await supabaseAdmin
    .from("videos")
    .update({
      geotag_status: "processing",
      geotag_attempted_at: new Date().toISOString(),
      geotag_model: env.geminiModel,
      geotag_prompt_version: PROMPT_VERSION,
    })
    .eq("id", videoId);

  try {
    const input = buildGeotagInput(row as Parameters<typeof buildGeotagInput>[0]);
    const gemini = await runGeminiGeotag(input, {
      apiKey: env.geminiApiKey,
      model: env.geminiModel,
      timeoutMs: env.geminiTimeoutMs,
      maxRetries: 3,
    });

    const rawRedacted = {
      has_place: gemini.place !== null,
      ambiguity: gemini.video_level.ambiguity,
    };

    const place = gemini.place;
    if (!place) {
      await supabaseAdmin
        .from("videos")
        .update({
          geotag_status: "needs_review",
          geotag_completed_at: new Date().toISOString(),
          geotag_error: null,
          geotag_raw_response: rawRedacted,
        })
        .eq("id", videoId);
      console.log("[geotag] needs_review no place", { videoId, ms: Date.now() - started });
      return;
    }

    const effectiveConfidence = applyAmbiguityPenalty(place.confidence, gemini.video_level.ambiguity);
    if (effectiveConfidence < env.geotagMinConfidenceToWrite) {
      await supabaseAdmin
        .from("videos")
        .update({
          geotag_status: "needs_review",
          geotag_completed_at: new Date().toISOString(),
          geotag_raw_response: rawRedacted,
          geotag_error: "Confidence below GEOTAG_MIN_CONFIDENCE_TO_WRITE",
        })
        .eq("id", videoId);
      console.log("[geotag] needs_review low confidence", { videoId, ms: Date.now() - started });
      return;
    }

    await deleteAutoGeotagLinks(supabaseAdmin, videoId);

    const locationId = await findOrCreateLocationFromGeminiCoords(supabaseAdmin, {
      place,
      effectiveConfidence,
    });
    await insertVideoLocation(supabaseAdmin, videoId, locationId, "auto_primary", effectiveConfidence);

    await supabaseAdmin
      .from("videos")
      .update({
        geotag_status: "completed",
        geotag_completed_at: new Date().toISOString(),
        geotag_error: null,
        geotag_raw_response: rawRedacted,
      })
      .eq("id", videoId);

    console.log("[geotag] completed", { videoId, ms: Date.now() - started });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("videos")
      .update({
        geotag_status: "failed",
        geotag_completed_at: new Date().toISOString(),
        geotag_error: truncateErr(msg),
      })
      .eq("id", videoId);
    console.error("[geotag] failed", { videoId, err: msg });
  }
}
