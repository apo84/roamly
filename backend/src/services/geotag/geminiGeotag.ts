import { readFileSync } from "fs";
import path from "path";
import type { GeminiGeotagResult, GeotagInput } from "./types";
import { isValidWgs84 } from "./coords";

function loadSystemInstruction(): string {
  try {
    const p = path.join(__dirname, "../../../docs/geotag-prompt-v2.md");
    return readFileSync(p, "utf8");
  } catch {
    return "You are a travel geolocation assistant. Output only valid JSON: single place with latitude & longitude or place null.";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseGeminiJson(text: string): GeminiGeotagResult {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(trimmed) as unknown;
  if (typeof parsed !== "object" || parsed === null || !("video_level" in parsed)) {
    throw new Error("Gemini JSON missing video_level");
  }
  const o = parsed as Record<string, unknown>;
  const vl = (o.video_level as Record<string, unknown>) || {};
  const amb = vl.ambiguity === "low" || vl.ambiguity === "medium" || vl.ambiguity === "high" ? vl.ambiguity : "medium";

  let place: GeminiGeotagResult["place"] = null;
  const pr = o.place;
  if (pr !== null && pr !== undefined && typeof pr === "object" && !Array.isArray(pr)) {
    const x = pr as Record<string, unknown>;
    const lat =
      typeof x.latitude === "number"
        ? x.latitude
        : typeof x.latitude === "string"
          ? parseFloat(x.latitude)
          : Number.NaN;
    const lng =
      typeof x.longitude === "number"
        ? x.longitude
        : typeof x.longitude === "string"
          ? parseFloat(x.longitude)
          : Number.NaN;
    if (!isValidWgs84(lat, lng)) {
      place = null;
    } else {
      place = {
        name: typeof x.name === "string" ? x.name : x.name === null ? null : null,
        city: typeof x.city === "string" ? x.city : x.city === null ? null : null,
        country: typeof x.country === "string" ? x.country : x.country === null ? null : null,
        latitude: lat,
        longitude: lng,
        confidence: typeof x.confidence === "number" && Number.isFinite(x.confidence) ? x.confidence : 0,
        reason_short: typeof x.reason_short === "string" ? x.reason_short : "",
      };
    }
  }

  return {
    place,
    video_level: {
      language_hint: typeof vl.language_hint === "string" ? vl.language_hint : vl.language_hint === null ? null : null,
      ambiguity: amb,
    },
  };
}

export type GeminiGeotagOptions = {
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
};

/**
 * Call Gemini Generative Language API; returns parsed JSON or throws.
 */
export async function runGeminiGeotag(input: GeotagInput, opts: GeminiGeotagOptions): Promise<GeminiGeotagResult> {
  const systemInstruction = loadSystemInstruction();
  const userText = `Here is video metadata as JSON:\n${JSON.stringify(input)}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction.slice(0, 24_000) }] },
    contents: [{ role: "user", parts: [{ text: userText.slice(0, 12_000) }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  let attempt = 0;
  let lastErr: Error | null = null;
  while (attempt < opts.maxRetries) {
    attempt += 1;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      clearTimeout(t);
      const rawText = await res.text();
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Gemini HTTP ${res.status}`);
        await sleep(400 * attempt);
        continue;
      }
      if (!res.ok) {
        throw new Error(`Gemini HTTP ${res.status}: ${rawText.slice(0, 200)}`);
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        throw new Error("Gemini response not JSON");
      }
      const root = parsed as Record<string, unknown>;
      const candidates = root.candidates as unknown[] | undefined;
      const first = candidates?.[0] as Record<string, unknown> | undefined;
      const content = first?.content as Record<string, unknown> | undefined;
      const parts = content?.parts as unknown[] | undefined;
      const part0 = parts?.[0] as Record<string, unknown> | undefined;
      const text = typeof part0?.text === "string" ? part0.text : "";
      if (!text) throw new Error("Gemini empty text");
      return parseGeminiJson(text);
    } catch (e) {
      clearTimeout(t);
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < opts.maxRetries) await sleep(300 * attempt);
    }
  }
  throw lastErr ?? new Error("Gemini failed");
}
