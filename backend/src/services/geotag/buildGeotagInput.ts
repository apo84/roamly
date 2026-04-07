import type { GeotagInput } from "./types";

/** Extract #hashtags from caption (ASCII-ish). */
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const re = /#([\p{L}\p{N}_]+)/gu;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1].toLowerCase());
  }
  return [...new Set(out)].slice(0, 30);
}

/**
 * Strip obvious PII-ish keys from raw_metadata before sending to Gemini.
 * Extend this list as needed.
 */
function redactRawMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const deny = new Set(["email", "phone", "token", "access_token", "ip", "password"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (deny.has(k.toLowerCase())) continue;
    if (typeof v === "string" && v.length > 2000) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

export function buildGeotagInput(row: {
  title: string;
  caption: string | null;
  platform: string;
  canonical_url?: string | null;
  raw_metadata?: unknown;
}): GeotagInput {
  const caption = row.caption ?? null;
  return {
    title: row.title ?? "",
    caption,
    platform: row.platform ?? "unknown",
    canonical_url: row.canonical_url ?? null,
    hashtags: extractHashtags(caption),
    raw_metadata_redacted: redactRawMetadata(row.raw_metadata),
  };
}
