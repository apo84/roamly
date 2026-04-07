import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Platform } from "./parseSocialUrl";
import { instagramProfileUrl } from "./instagramMetadata";

/**
 * Upsert creator by (platform, handle). Handle stored lowercase without @.
 */
export async function upsertCreator(
  supabase: SupabaseClient,
  platform: Platform,
  handle: string,
  opts: { displayName?: string | null; socialUrl?: string | null },
): Promise<string | null> {
  const normalized = handle.replace(/^@/, "").trim().toLowerCase();
  if (!normalized || !/^[a-z0-9._]+$/.test(normalized)) return null;

  const socialUrl = opts.socialUrl ?? (platform === "instagram" ? instagramProfileUrl(normalized) : null);
  const displayName = opts.displayName?.trim() || null;

  const { data: existing, error: selErr } = await supabase
    .from("creators")
    .select("id, display_name, social_url")
    .eq("platform", platform)
    .eq("handle", normalized)
    .maybeSingle();

  if (selErr) {
    console.error("[creatorsRepo] select", selErr);
    return null;
  }

  if (existing?.id) {
    const row = existing as { id: string; display_name: string | null; social_url?: string | null };
    const patch: Record<string, string> = {};
    if (displayName && displayName !== row.display_name) patch.display_name = displayName;
    if (socialUrl != null && socialUrl !== row.social_url) patch.social_url = socialUrl;
    if (Object.keys(patch).length) {
      patch.updated_at = new Date().toISOString();
      const { error: upErr } = await supabase.from("creators").update(patch).eq("id", row.id);
      if (upErr) console.error("[creatorsRepo] update", upErr);
    }
    return row.id;
  }

  const id = randomUUID();
  const { data: inserted, error: insErr } = await supabase
    .from("creators")
    .insert({
      id,
      handle: normalized,
      platform,
      display_name: displayName,
      social_url: socialUrl,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[creatorsRepo] insert", insErr);
    return null;
  }
  return inserted.id as string;
}
