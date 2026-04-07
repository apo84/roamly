import { supabaseAdmin } from "../../supabaseClient";
import { runGeotagForVideo } from "./runGeotagForVideo";

/**
 * Claim one pending job and run the pipeline. Returns true if a job was processed.
 */
export async function processNextGeotagJob(): Promise<boolean> {
  const { data: pending } = await supabaseAdmin
    .from("geotag_jobs")
    .select("id, video_id, attempts, max_attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pending?.id || !pending.video_id) return false;

  const now = new Date().toISOString();
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("geotag_jobs")
    .update({ status: "processing", locked_at: now, updated_at: now })
    .eq("id", pending.id)
    .eq("status", "pending")
    .select("id, video_id, attempts, max_attempts")
    .maybeSingle();

  if (claimErr || !claimed) return false;

  const videoId = claimed.video_id as string;
  const jobId = claimed.id as string;

  await runGeotagForVideo(videoId);

  const { data: vrow } = await supabaseAdmin.from("videos").select("geotag_status").eq("id", videoId).maybeSingle();
  const st = vrow?.geotag_status as string | undefined;

  const attempts = (typeof claimed.attempts === "number" ? claimed.attempts : 0) + 1;
  const maxAttempts = typeof claimed.max_attempts === "number" ? claimed.max_attempts : 5;

  if (st === "failed" && attempts < maxAttempts) {
    await supabaseAdmin
      .from("geotag_jobs")
      .update({
        status: "pending",
        attempts,
        locked_at: null,
        next_run_at: new Date(Date.now() + Math.min(60_000 * attempts, 900_000)).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return true;
  }

  await supabaseAdmin
    .from("geotag_jobs")
    .update({
      status: "completed",
      attempts,
      locked_at: null,
      last_error: st === "failed" ? "geotag_status failed after max attempts" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  return true;
}
