/** Parsed Gemini geotag response (geotag-prompt-v2): one WGS84 point or null. */
export type GeminiPlaceV2 = {
  name: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  confidence: number;
  reason_short: string;
};

export type GeminiGeotagResult = {
  place: GeminiPlaceV2 | null;
  video_level: {
    language_hint: string | null;
    ambiguity: "low" | "medium" | "high";
  };
};

export type GeotagInput = {
  title: string;
  caption: string | null;
  platform: string;
  canonical_url: string | null;
  hashtags: string[];
  raw_metadata_redacted: Record<string, unknown> | null;
};
