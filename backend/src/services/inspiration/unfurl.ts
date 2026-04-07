import type { Platform } from "./parseSocialUrl";
import { readResponseBodyLimited, MAX_BODY_BYTES } from "./resolveUrl";

const UNFURL_FETCH_MS = 8000;

const FETCH_HEADERS = {
  "User-Agent": "RoamlyInspirationBot/1.0 (+https://roamly.app)",
  Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
};

export type UnfurlMetadata = {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  author?: string;
};

function metaContent(html: string, prop: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return decodeHtmlEntities(m[1]);
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1] ? decodeHtmlEntities(m2[1]) : undefined;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), UNFURL_FETCH_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: FETCH_HEADERS });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function oEmbedTikTok(pageUrl: string): Promise<UnfurlMetadata | null> {
  const url = `https://www.tiktok.com/oembed?url=${encodeURIComponent(pageUrl)}`;
  const json = await fetchJson(url);
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  return {
    title: typeof o.title === "string" ? o.title : undefined,
    author: typeof o.author_name === "string" ? o.author_name : undefined,
    thumbnailUrl: typeof o.thumbnail_url === "string" ? o.thumbnail_url : undefined,
  };
}

async function oEmbedYouTube(pageUrl: string): Promise<UnfurlMetadata | null> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(pageUrl)}`;
  const json = await fetchJson(url);
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  return {
    title: typeof o.title === "string" ? o.title : undefined,
    author: typeof o.author_name === "string" ? o.author_name : undefined,
    thumbnailUrl: typeof o.thumbnail_url === "string" ? o.thumbnail_url : undefined,
  };
}

async function openGraphFromResponse(res: Response): Promise<UnfurlMetadata> {
  const html = await readResponseBodyLimited(res, MAX_BODY_BYTES, { timeoutMs: UNFURL_FETCH_MS });
  return {
    title: metaContent(html, "og:title"),
    description: metaContent(html, "og:description"),
    thumbnailUrl: metaContent(html, "og:image"),
  };
}

/**
 * Best-effort metadata: oEmbed where available, else OG tags from the given response or a fresh fetch.
 */
export async function unfurlSocial(
  platform: Platform,
  pageUrl: string,
  initialResponse?: Response,
): Promise<UnfurlMetadata> {
  if (platform === "tiktok") {
    const o = await oEmbedTikTok(pageUrl);
    if (o?.title || o?.thumbnailUrl) return o;
  }
  if (platform === "youtube") {
    const o = await oEmbedYouTube(pageUrl);
    if (o?.title || o?.thumbnailUrl) return o;
  }

  if (initialResponse?.ok && initialResponse.body) {
    const clone = initialResponse.clone();
    const og = await openGraphFromResponse(clone);
    if (og.title || og.thumbnailUrl) return og;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UNFURL_FETCH_MS);
  try {
    const res = await fetch(pageUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: FETCH_HEADERS,
    });
    if (res.ok) {
      return await openGraphFromResponse(res);
    }
  } catch {
    /* ignore */
  } finally {
    clearTimeout(timer);
  }

  return {};
}
