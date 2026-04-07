import { urlAllowed } from "./allowlist";

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 10;
const MAX_BODY_BYTES = 512 * 1024;

const FETCH_HEADERS = {
  "User-Agent": "RoamlyInspirationBot/1.0 (+https://roamly.app)",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
};

export type ResolveResult = {
  finalUrl: string;
  /** Response after following redirects manually (body may be truncated when read). */
  response: Response;
};

/**
 * Follow redirects manually so every hop stays on the allowlisted hosts (SSRF mitigation).
 */
export async function resolveUrl(
  startUrl: string,
  options?: { timeoutMs?: number },
): Promise<ResolveResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!urlAllowed(startUrl)) {
    throw new Error("URL_NOT_ALLOWED");
  }

  let current = startUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: FETCH_HEADERS,
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) {
          throw new Error("Redirect without Location header");
        }
        const next = new URL(loc, current).href;
        if (!urlAllowed(next)) {
          throw new Error("URL_NOT_ALLOWED");
        }
        current = next;
        continue;
      }

      if (res.ok) {
        return { finalUrl: current, response: res };
      }

      // Some platforms return 401/403 to bots; we still have a resolved permalink.
      if (res.status === 403 || res.status === 401) {
        return { finalUrl: current, response: res };
      }

      throw new Error(`HTTP ${res.status}`);
    }
    throw new Error("Too many redirects");
  } finally {
    clearTimeout(timer);
  }
}

export type ReadBodyOptions = { timeoutMs?: number };

/** Read at most maxBytes from a Response body (for OG / HTML parse). */
export async function readResponseBodyLimited(
  res: Response,
  maxBytes: number,
  options?: ReadBodyOptions,
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 15_000;

  const readAll = async (): Promise<string> => {
    const reader = res.body?.getReader();
    if (!reader) {
      const buf = await res.arrayBuffer();
      return Buffer.from(buf).toString("utf8", 0, Math.min(buf.byteLength, maxBytes));
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          const slice = value.slice(0, Math.max(0, value.byteLength - (total - maxBytes)));
          if (slice.byteLength) chunks.push(slice);
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const merged = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return merged.toString("utf8", 0, Math.min(merged.length, maxBytes));
  };

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("readResponseBodyLimited_timeout")), timeoutMs);
  });
  try {
    return await Promise.race([readAll(), timeoutPromise]);
  } catch (e) {
    if (e instanceof Error && e.message === "readResponseBodyLimited_timeout") {
      try {
        await res.body?.cancel();
      } catch {
        /* ignore */
      }
      return "";
    }
    throw e;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export { MAX_BODY_BYTES };
