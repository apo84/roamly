import { parseHttpUrl, urlAllowed } from "./allowlist";

export type Platform = "instagram" | "tiktok" | "youtube";

export type ParsedSocialUrl = {
  platform: Platform;
  externalId: string;
  /** Stable permalink for dedupe / open-in-app (no tracking query). */
  canonicalUrl: string;
};

function igCanonical(shortcode: string): string {
  return `https://www.instagram.com/p/${shortcode}/`;
}

function tiktokCanonical(videoId: string): string {
  return `https://www.tiktok.com/video/${videoId}`;
}

function youtubeCanonical(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Extract platform + external id from a fully resolved URL (after redirects).
 */
export function parseSocialUrl(resolvedUrl: string): ParsedSocialUrl | null {
  if (!urlAllowed(resolvedUrl)) return null;
  const u = parseHttpUrl(resolvedUrl);
  if (!u) return null;

  const host = u.hostname.toLowerCase();
  const path = u.pathname.replace(/\/+$/, "") || "/";

  // Instagram
  if (host === "instagram.com" || host === "www.instagram.com") {
    const m = path.match(/^\/(?:p|reel|reels|tv)\/([^/?#]+)/i);
    if (!m?.[1]) return null;
    const shortcode = m[1];
    return {
      platform: "instagram",
      externalId: shortcode,
      canonicalUrl: igCanonical(shortcode),
    };
  }

  // TikTok (short domains resolve to www or video URL)
  if (
    host === "tiktok.com" ||
    host === "www.tiktok.com" ||
    host === "m.tiktok.com" ||
    host === "vm.tiktok.com" ||
    host === "vt.tiktok.com"
  ) {
    const videoInPath = path.match(/\/video\/(\d+)/);
    if (videoInPath?.[1]) {
      return {
        platform: "tiktok",
        externalId: videoInPath[1],
        canonicalUrl: tiktokCanonical(videoInPath[1]),
      };
    }
    return null;
  }

  // YouTube
  if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
    if (path.startsWith("/watch")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return { platform: "youtube", externalId: v, canonicalUrl: youtubeCanonical(v) };
      }
    }
    const shorts = path.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shorts?.[1]) {
      return { platform: "youtube", externalId: shorts[1], canonicalUrl: youtubeCanonical(shorts[1]) };
    }
    return null;
  }

  if (host === "youtu.be") {
    const id = path.slice(1).split("/")[0];
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return { platform: "youtube", externalId: id, canonicalUrl: youtubeCanonical(id) };
    }
    return null;
  }

  return null;
}
