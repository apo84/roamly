import Constants from "expo-constants";
import { supabase } from "../supabase";
import type {
  CollectionDetailPayload,
  CollectionItemRow,
  CollectionSummary,
  CreateCollectionInput,
  InspirationDetail,
  InspirationListItem,
  MapPin,
  SaveInspirationInput,
  SaveInspirationResult,
} from "../../types/inspiration";

/**
 * Prefer `extra.apiUrl` from app.config.js (loads mobile/.env when Expo starts).
 * Metro-inlined `process.env.EXPO_PUBLIC_API_URL` can stay stuck on an old value until cache clears.
 */
const extraApiUrl = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim() ?? "";
const envApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();
const API_BASE = (extraApiUrl || envApiUrl).replace(/\/$/, "");
const API_URL_SOURCE = extraApiUrl ? "app.config.js extra.apiUrl" : "process.env.EXPO_PUBLIC_API_URL (metro)";

/** Dev-only structured logs for API debugging (Metro console). */
function apiDebug(phase: string, data: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[api:${phase}]`, data);
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Human + technical summary for alerts / logs. */
export function formatApiFailure(err: unknown): { title: string; detail: string } {
  if (err instanceof ApiError) {
    const parts = [`HTTP ${err.status}`, err.code ? `code=${err.code}` : null].filter(Boolean).join(" · ");
    return { title: "API request failed", detail: `${err.message}\n\n${parts}` };
  }
  if (err instanceof Error) {
    return { title: "Request failed", detail: err.message };
  }
  return { title: "Request failed", detail: String(err) };
}

async function getAccessToken(): Promise<string> {
  if (!supabase) {
    apiDebug("auth", { ok: false, reason: "supabase client null" });
    throw new ApiError("Supabase is not configured in mobile env", 500, "SUPABASE_NOT_CONFIGURED");
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    apiDebug("auth", { ok: false, reason: "no session access_token" });
    throw new ApiError("Please sign in to continue", 401, "UNAUTHENTICATED");
  }
  apiDebug("auth", { ok: true, hasAccessToken: true });
  return token;
}

function getApiBase(): string {
  if (!API_BASE) {
    apiDebug("config", { EXPO_PUBLIC_API_URL: "(empty)" });
    throw new ApiError("EXPO_PUBLIC_API_URL is missing in mobile/.env", 500, "API_NOT_CONFIGURED");
  }
  apiDebug("config", { baseUrl: API_BASE, apiUrlSource: API_URL_SOURCE });
  return API_BASE;
}

type RequestJsonOptions = { timeoutMs?: number; opLabel?: string };

async function requestJson<T>(path: string, init?: RequestInit, options?: RequestJsonOptions): Promise<T> {
  const method = init?.method ?? "GET";
  const token = await getAccessToken();
  const base = getApiBase();
  const url = `${base}${path}`;
  const started = Date.now();

  apiDebug("fetch_start", {
    method,
    url,
    op: options?.opLabel,
    timeoutMs: options?.timeoutMs,
    bodyPreview:
      typeof init?.body === "string" ? (init.body as string).slice(0, 200) : init?.body ? "(non-string)" : undefined,
  });

  const abortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  if (options?.timeoutMs) {
    timeoutId = setTimeout(() => {
      apiDebug("fetch_abort_timeout", {
        url,
        op: options.opLabel,
        afterMs: options.timeoutMs,
      });
      abortController.abort();
    }, options.timeoutMs);
  }

  if (__DEV__ && options?.opLabel && options?.timeoutMs) {
    pollTimer = setInterval(() => {
      apiDebug("fetch_still_waiting", { op: options.opLabel, elapsedMs: Date.now() - started });
    }, 10_000);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      ...(options?.timeoutMs ? { signal: abortController.signal } : {}),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (pollTimer !== undefined) clearInterval(pollTimer);
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message === "Aborted" || (err as { code?: string }).code === "ABORT_ERR");
    if (isAbort && options?.timeoutMs) {
      throw new ApiError(
        `Save timed out after ${Math.round(options.timeoutMs / 1000)}s. Check the backend terminal for [inspiration/save …] logs (resolve/unfurl can be slow).`,
        408,
        "CLIENT_TIMEOUT",
      );
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    apiDebug("fetch_network_error", {
      method,
      url,
      base,
      errorName: err instanceof Error ? err.name : "unknown",
      errorMessage: errMsg,
      hint:
        "If URL uses localhost: Android emulator needs http://10.0.2.2:PORT; physical device needs your Mac LAN IP.",
    });
    throw new ApiError(
      `Cannot reach backend (${errMsg}).\n\n` +
        `Base URL: ${base}\n` +
        `Android emulator: try EXPO_PUBLIC_API_URL=http://10.0.2.2:4000\n` +
        `Physical phone: use your computer's Wi‑Fi IP (e.g. http://192.168.x.x:4000)`,
      0,
      "NETWORK_ERROR",
    );
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (pollTimer !== undefined) clearInterval(pollTimer);
  }

  const elapsedMs = Date.now() - started;
  const contentType = res.headers.get("content-type") ?? "";

  apiDebug("fetch_done", {
    method,
    url,
    status: res.status,
    elapsedMs,
    contentType,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const rawText = await res.text();
  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      parsed = rawText;
    }
  }

  if (!res.ok) {
    const obj = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
    const message =
      (obj?.message as string | undefined) ??
      (obj?.error as string | undefined) ??
      (typeof parsed === "string" ? parsed.slice(0, 300) : `HTTP ${res.status}`);
    const code = obj?.code as string | undefined;
    apiDebug("fetch_error_body", {
      url,
      status: res.status,
      code,
      message,
      rawSnippet: typeof rawText === "string" ? rawText.slice(0, 500) : undefined,
    });
    throw new ApiError(message, res.status, code);
  }

  apiDebug("fetch_success", { url, elapsedMs });
  return parsed as T;
}

export async function listCollections(): Promise<CollectionSummary[]> {
  const body = await requestJson<{ collections: CollectionSummary[] }>("/api/collections", { method: "GET" });
  return body.collections ?? [];
}

export async function createCollection(input: CreateCollectionInput): Promise<CollectionSummary> {
  const body = await requestJson<{ collection: CollectionSummary }>("/api/collections", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      city: input.city,
      country: input.country,
      cover_image_url: input.cover_image_url,
    }),
  });
  if (!body.collection) {
    throw new ApiError("Invalid create collection response", 500);
  }
  return body.collection;
}

export async function getCollection(collectionId: string): Promise<CollectionDetailPayload> {
  return requestJson<CollectionDetailPayload>(`/api/collections/${collectionId}`, { method: "GET" });
}

export async function patchCollectionItem(
  collectionId: string,
  itemId: string,
  patch: {
    user_note?: string | null;
    visit_start?: string | null;
    visit_end?: string | null;
  },
): Promise<CollectionItemRow> {
  const body = await requestJson<{ item: CollectionItemRow }>(
    `/api/collections/${collectionId}/items/${itemId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  if (!body.item) {
    throw new ApiError("Invalid patch collection item response", 500);
  }
  return body.item;
}

/** Add a clip that is already in the user's Inspo library to a collection. */
export async function addVideoToCollection(collectionId: string, videoId: string): Promise<CollectionItemRow> {
  const body = await requestJson<{ item: CollectionItemRow }>(`/api/collections/${collectionId}/items`, {
    method: "POST",
    body: JSON.stringify({ video_id: videoId }),
  });
  if (!body.item) {
    throw new ApiError("Invalid add-to-collection response", 500);
  }
  return body.item;
}

export async function saveInspiration(input: SaveInspirationInput): Promise<SaveInspirationResult> {
  apiDebug("saveInspiration_input", {
    urlLength: input.url?.length ?? 0,
    hasNote: Boolean(input.note),
    hasCollectionId: Boolean(input.collectionId),
    hasVisitStart: Boolean(input.visitStart),
    hasVisitEnd: Boolean(input.visitEnd),
  });
  return requestJson<SaveInspirationResult>(
    "/api/inspiration/save",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { timeoutMs: 90_000, opLabel: "inspiration/save" },
  );
}

/** Map pins for the signed-in user’s library (auto + manual geotags via video_locations). */
export async function listMapPins(params?: {
  ne_lat?: number;
  ne_lng?: number;
  sw_lat?: number;
  sw_lng?: number;
}): Promise<MapPin[]> {
  const q = new URLSearchParams();
  if (params?.ne_lat !== undefined) q.set("ne_lat", String(params.ne_lat));
  if (params?.ne_lng !== undefined) q.set("ne_lng", String(params.ne_lng));
  if (params?.sw_lat !== undefined) q.set("sw_lat", String(params.sw_lat));
  if (params?.sw_lng !== undefined) q.set("sw_lng", String(params.sw_lng));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const body = await requestJson<{ pins: MapPin[] }>(`/api/map/pins${suffix}`, { method: "GET" });
  return body.pins ?? [];
}

export async function listInspiration(params?: {
  collectionId?: string;
  hasLocation?: boolean;
}): Promise<InspirationListItem[]> {
  const query = new URLSearchParams();
  if (params?.collectionId) query.set("collectionId", params.collectionId);
  if (params?.hasLocation) query.set("hasLocation", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const body = await requestJson<{ items: InspirationListItem[] }>(`/api/inspiration${suffix}`, { method: "GET" });
  return body.items ?? [];
}

export async function getInspiration(videoId: string): Promise<InspirationDetail> {
  return requestJson<InspirationDetail>(`/api/inspiration/${videoId}`, { method: "GET" });
}

export async function patchInspiration(
  videoId: string,
  patch: {
    note?: string | null;
    collectionId?: string;
    locationId?: string;
    placeLabel?: string;
    placeCity?: string;
    placeCountry?: string;
    lat?: number;
    lng?: number;
  },
): Promise<{
  savedLink: {
    user_id: string;
    video_id: string;
    saved_at: string;
    user_note: string | null;
  };
  collectionItem: Record<string, unknown> | null;
}> {
  return requestJson(`/api/inspiration/${videoId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function removeInspiration(videoId: string): Promise<void> {
  await requestJson<void>(`/api/inspiration/${videoId}`, { method: "DELETE" });
}
