import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mark video pending and insert a job row (deduped by partial unique index).
 */
export async function enqueueGeotagJob(supabase: SupabaseClient, videoId: string): Promise<void> {
  const { data: v } = await supabase.from("videos").select("geotag_status").eq("id", videoId).maybeSingle();
  const st = v?.geotag_status as string | undefined;
  if (st === "completed" || st === "processing") {
    return;
  }

  const now = new Date().toISOString();
  await supabase
    .from("videos")
    .update({
      geotag_status: "pending",
      geotag_error: null,
    })
    .eq("id", videoId);

  const { error } = await supabase.from("geotag_jobs").insert({
    video_id: videoId,
    status: "pending",
    next_run_at: now,
    updated_at: now,
  });

  if (error) {
    if (error.code === "23505") {
      return;
    }
    console.warn("[geotag] enqueue insert failed", videoId, error.message);
  }
}
