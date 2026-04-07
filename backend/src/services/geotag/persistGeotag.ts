import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeminiPlaceV2 } from "./types";

export type PersistGeminiCoords = {
  place: GeminiPlaceV2;
  /** After ambiguity penalty, threshold check */
  effectiveConfidence: number;
};

/**
 * Remove prior auto-geotag links so re-runs are idempotent.
 */
export async function deleteAutoGeotagLinks(supabase: SupabaseClient, videoId: string): Promise<void> {
  await supabase.from("video_locations").delete().eq("video_id", videoId).eq("auto_geotagged", true);
}

const COORD_EPS = 0.00025;

/**
 * Insert or reuse a nearby `locations` row (same source, ~28m) to limit duplicate pins.
 */
export async function findOrCreateLocationFromGeminiCoords(
  supabase: SupabaseClient,
  p: PersistGeminiCoords,
): Promise<string> {
  const lat = p.place.latitude;
  const lng = p.place.longitude;
  const { data: near } = await supabase
    .from("locations")
    .select("id")
    .eq("source", "gemini_llm")
    .gte("lat", lat - COORD_EPS)
    .lte("lat", lat + COORD_EPS)
    .gte("lng", lng - COORD_EPS)
    .lte("lng", lng + COORD_EPS)
    .limit(1)
    .maybeSingle();

  if (near?.id) return near.id as string;

  const name =
    (p.place.name && p.place.name.trim()) ||
    [p.place.city, p.place.country].filter(Boolean).join(", ") ||
    "Place";
  const city = (p.place.city && p.place.city.trim()) || "Unknown";
  const country = (p.place.country && p.place.country.trim()) || "Unknown";
  const label = [p.place.name, p.place.city, p.place.country].filter(Boolean).join(", ") || name;

  const id = randomUUID();

  const { data: inserted, error } = await supabase
    .from("locations")
    .insert({
      id,
      name: name.slice(0, 500),
      city: city.slice(0, 200),
      country: country.slice(0, 200),
      lat,
      lng,
      type: null,
      address: null,
      google_place_id: null,
      osm_id: null,
      source: "gemini_llm",
      geocode_formatted_address: label.slice(0, 1000),
      confidence: p.effectiveConfidence,
    })
    .select("id")
    .single();

  if (error) throw new Error(`locations insert: ${error.message}`);
  return (inserted as { id: string }).id;
}

export async function insertVideoLocation(
  supabase: SupabaseClient,
  videoId: string,
  locationId: string,
  role: "auto_primary",
  confidence: number,
): Promise<void> {
  const { error } = await supabase.from("video_locations").upsert(
    {
      video_id: videoId,
      location_id: locationId,
      role,
      confidence,
      auto_geotagged: true,
    },
    { onConflict: "video_id,location_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(`video_locations upsert: ${error.message}`);
}
