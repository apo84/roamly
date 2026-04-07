import { decodeHtmlEntities } from "./htmlEntities";
import { parseEngagementNumber } from "./parseEngagementNumber";
import type { Platform } from "./parseSocialUrl";

export type InstagramOgDerived = {
  /** Decoded creator display name from og:title (before " on Instagram") */
  displayName: string | null;
  /** Handle from og:description segment (after "comments - ") */
  handle: string | null;
  likeCount: number;
  commentCount: number;
  /** Caption inside quotes after the date, decoded */
  caption: string | null;
  /** Short line for videos.title — display name or fallback */
  videoTitle: string;
  /** Same as caption when parsed; else full decoded description */
  videoCaption: string | null;
};

const DESC_PATTERN =
  /^(.+?)\s+likes,\s*(.+?)\s+comments\s*-\s*([^\s]+)\s+on\s+[^:]+:\s*"(.*)"\s*\.?\s*$/is;

/**
 * Instagram oEmbed / OG often uses this description shape:
 * "107K likes, 172 comments - {handle} on {date}: \"{caption}\"."
 */
export function parseInstagramOgDescription(rawDescription: string | undefined | null): {
  likeCount: number;
  commentCount: number;
  handle: string | null;
  captionRaw: string | null;
} {
  if (!rawDescription?.trim()) {
    return { likeCount: 0, commentCount: 0, handle: null, captionRaw: null };
  }
  const m = rawDescription.trim().match(DESC_PATTERN);
  if (!m) {
    return { likeCount: 0, commentCount: 0, handle: null, captionRaw: null };
  }
  const likeCount = parseEngagementNumber(m[1]);
  const commentCount = parseEngagementNumber(m[2]);
  const handle = normalizeHandle(m[3]);
  const captionRaw = m[4]?.trim() ?? null;
  return { likeCount, commentCount, handle, captionRaw };
}

/**
 * og:title like: "&#x1d7f0;… on Instagram: \"…\""
 * Display name is the part before " on Instagram" (case-insensitive).
 */
export function parseInstagramOgTitle(rawTitle: string | undefined | null): {
  displayNameRaw: string | null;
} {
  if (!rawTitle?.trim()) return { displayNameRaw: null };
  const m = rawTitle.match(/^(.+?)\s+on\s+Instagram\s*:/is);
  if (!m) return { displayNameRaw: null };
  return { displayNameRaw: m[1].trim() };
}

function normalizeHandle(h: string): string | null {
  const t = h.replace(/^@/, "").trim();
  if (!/^[a-zA-Z0-9._]+$/.test(t)) return null;
  return t.toLowerCase();
}

export function instagramProfileUrl(handle: string): string {
  return `https://www.instagram.com/${handle.replace(/^@/, "").toLowerCase()}/`;
}

/**
 * Derive DB/UI fields from unfurl title + description when platform is Instagram.
 */
export function deriveFromInstagramUnfurl(
  metadata: { title?: string; description?: string },
  fallbackPlatformTitle: string,
): InstagramOgDerived {
  const decodedTitle = decodeHtmlEntities(metadata.title ?? "");
  const decodedDescription = decodeHtmlEntities(metadata.description ?? "");

  const fromDesc = parseInstagramOgDescription(metadata.description);
  const fromTitle = parseInstagramOgTitle(metadata.title);

  const displayNameDecoded = fromTitle.displayNameRaw
    ? decodeHtmlEntities(fromTitle.displayNameRaw).trim()
    : null;

  const captionDecoded = fromDesc.captionRaw ? decodeHtmlEntities(fromDesc.captionRaw).trim() : null;

  const videoTitle =
    displayNameDecoded ||
    (decodedTitle ? decodedTitle.split(/\s+on\s+Instagram\s*:/i)[0]?.trim() || decodedTitle : "") ||
    fallbackPlatformTitle;

  const videoCaption =
    captionDecoded ||
    (decodedDescription.trim() || null);

  return {
    displayName: displayNameDecoded,
    handle: fromDesc.handle,
    likeCount: fromDesc.likeCount,
    commentCount: fromDesc.commentCount,
    caption: captionDecoded,
    videoTitle: videoTitle.slice(0, 500),
    videoCaption: videoCaption ? videoCaption.slice(0, 8000) : null,
  };
}

/** No-op for non-Instagram; returns null so caller keeps generic unfurl behavior. */
export function deriveCreatorAndCounts(
  platform: Platform,
  metadata: { title?: string; description?: string },
  fallbackPlatformTitle: string,
): InstagramOgDerived | null {
  if (platform !== "instagram") return null;
  return deriveFromInstagramUnfurl(metadata, fallbackPlatformTitle);
}
