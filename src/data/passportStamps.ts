import { barcelonaVideos } from "@/data/barcelonaData";
import { mockCollections, mockVideos, type Collection, type Video } from "@/data/mockData";

export type StampAttachmentType = "clip" | "collection";

export interface StampAttachment {
  type: StampAttachmentType;
  id: string;
}

export interface PassportStamp {
  id: string;
  title: string;
  body: string;
  postedAt: string;
  attachments: StampAttachment[];
}

const STORAGE_KEY = "roamly_passport_stamps_v1";

export function findVideoById(id: string): Video | undefined {
  return barcelonaVideos.find((v) => v.id === id) ?? mockVideos.find((v) => v.id === id);
}

export function findCollectionById(id: string): Collection | undefined {
  return mockCollections.find((c) => c.id === id);
}

/** Barcelona trip map pins use index-aligned arrays; return index for ?video= */
export function barcelonaVideoIndex(videoId: string): number {
  return barcelonaVideos.findIndex((v) => v.id === videoId);
}

export function clipDestination(videoId: string): string {
  if (barcelonaVideoIndex(videoId) >= 0) {
    return `/trip/barcelona?video=${encodeURIComponent(videoId)}`;
  }
  return `/explore?clip=${encodeURIComponent(videoId)}`;
}

export function collectionDestination(collectionId: string): string {
  if (findCollectionById(collectionId)) {
    return `/spotlight/collection/${encodeURIComponent(collectionId)}`;
  }
  return `/collections/${encodeURIComponent(collectionId)}`;
}

const TOKEN_RE = /\{\{(clip|collection):([^}]+)\}\}/g;

export function extractAttachmentsFromBody(body: string): StampAttachment[] {
  const seen = new Set<string>();
  const out: StampAttachment[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE.source, "g");
  while ((m = re.exec(body)) !== null) {
    const type = m[1] as StampAttachmentType;
    const id = m[2].trim();
    if (!id) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, id });
  }
  return out;
}

export const SEED_PASSPORT_STAMPS: PassportStamp[] = [
  {
    id: "seed-stamp-1",
    title: "BCN — market to bunkers",
    body:
      "Day one we hit {{clip:bv1}} for breakfast vibes, then ended the golden hour at {{clip:bv7}}. Half my saves live in {{collection:c4}} now.",
    postedAt: "2026-02-18T09:00:00.000Z",
    attachments: [],
  },
  {
    id: "seed-stamp-2",
    title: "Food + culture stack",
    body:
      "Tapas at {{clip:bv3}} and the cathedral energy from {{clip:bv5}}. Also bookmarked {{collection:c2}} for the next Paris leg.",
    postedAt: "2026-02-19T14:30:00.000Z",
    attachments: [],
  },
].map((s) => ({
  ...s,
  attachments: extractAttachmentsFromBody(s.body),
}));

function loadUserStamps(): PassportStamp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { stamps?: PassportStamp[] };
    if (!Array.isArray(parsed.stamps)) return [];
    return parsed.stamps.filter((s) => s && typeof s.id === "string" && typeof s.body === "string");
  } catch {
    return [];
  }
}

export function loadAllPassportStamps(): PassportStamp[] {
  const user = loadUserStamps();
  const normalizedUser = user.map((s) => ({
    ...s,
    attachments: s.attachments?.length ? s.attachments : extractAttachmentsFromBody(s.body),
  }));
  const merged = [...normalizedUser, ...SEED_PASSPORT_STAMPS.map((s) => ({ ...s }))];
  merged.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  return merged;
}

export function saveUserPassportStamps(stamps: PassportStamp[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ stamps }));
}

export function appendPassportStamp(stamp: PassportStamp): PassportStamp[] {
  const current = loadUserStamps();
  const next = [
    {
      ...stamp,
      attachments: stamp.attachments.length ? stamp.attachments : extractAttachmentsFromBody(stamp.body),
    },
    ...current,
  ];
  saveUserPassportStamps(next);
  return loadAllPassportStamps();
}
