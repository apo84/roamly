import path from "path";
import dotenv from "dotenv";

// Ensure we always load `backend/.env` regardless of the current working directory.
dotenv.config({ path: path.join(__dirname, "../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultValue;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function optionalInt(name: string, defaultVal: number): number {
  const v = process.env[name];
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : defaultVal;
}

function optionalFloat(name: string, defaultVal: number): number {
  const v = process.env[name];
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : defaultVal;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT || "4000", 10),
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  sessionSecret: requireEnv("SESSION_SECRET"),
  appOauthRedirectUrl: requireEnv("APP_OAUTH_REDIRECT_URL"),
  /** After `20260329120000_creators_comment_count_rls.sql`, set to "1" to select/store `videos.comment_count`. */
  videoIncludeCommentCount: process.env.SUPABASE_VIDEO_INCLUDE_COMMENT_COUNT === "1",
  /** Set to "1" only if `videos.view_count` exists (see `backend_storage_plan.md`). Many early schemas omit it. */
  videoIncludeViewCount: process.env.SUPABASE_VIDEO_INCLUDE_VIEW_COUNT === "1",

  /** Set to "1" to run Gemini geotag pipeline (prompt v2: direct lat/lng). */
  geotagEnabled: optionalBool("GEOTAG_ENABLED", true),
  /** After each new inspiration save, enqueue `geotag_jobs` (recommended). */
  geotagAsync: optionalBool("GEOTAG_ASYNC", true),
  /** If true and `geotagAsync` is false, run geotag inline on save (slow; dev only). */
  geotagOnSave: optionalBool("GEOTAG_ON_SAVE", false),
  /** Google AI Studio / Gemini API key: https://aistudio.google.com/apikey */
  geminiApiKey: (process.env.GEMINI_API_KEY ?? "").trim(),
  /** e.g. gemini-2.0-flash — https://ai.google.dev/gemini-api/docs/models */
  geminiModel: (process.env.GEMINI_MODEL ?? "gemini-2.0-flash").trim(),
  geminiTimeoutMs: optionalInt("GEMINI_TIMEOUT_MS", 45_000),
  /** Minimum fused confidence (0–1) to write `video_locations` auto rows. */
  geotagMinConfidenceToWrite: optionalFloat("GEOTAG_MIN_CONFIDENCE_TO_WRITE", 0.35),
  /** Minimum `video_locations.confidence` for a pin to appear on `GET /api/map/pins`. */
  mapPinMinConfidence: optionalFloat("MAP_PIN_MIN_CONFIDENCE", 0.25),
  /** Worker loop sleep when idle (ms). */
  geotagPollMs: optionalInt("GEOTAG_POLL_MS", 5000),
};
