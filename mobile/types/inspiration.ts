export type Platform = "instagram" | "tiktok" | "youtube";

export interface LocationPoint {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface InspirationVideo {
  id: string;
  external_id: string;
  platform: Platform;
  title: string;
  caption: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  canonical_url: string | null;
  created_at: string | null;
  ingested_at: string;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  creator_id?: string | null;
}

export interface InspirationCollectionItem {
  id?: string;
  collectionId?: string;
  position?: number;
  userNote?: string | null;
  visitStart?: string | null;
  visitEnd?: string | null;
  locationId?: string | null;
  location?: LocationPoint | null;
}

export interface InspirationListItem {
  video: InspirationVideo;
  libraryNote: string | null;
  savedAt: string | null;
  collectionItem: InspirationCollectionItem | null;
}

export interface InspirationDetail {
  video: InspirationVideo;
  savedLink: {
    savedAt: string;
    userNote: string | null;
    videoId: string;
  };
  collectionItems: InspirationCollectionItem[];
}

export interface SaveInspirationInput {
  url: string;
  note?: string;
  collectionId?: string;
  visitStart?: string;
  visitEnd?: string;
}

export interface SaveInspirationResult {
  video: InspirationVideo;
  savedLink: {
    user_id: string;
    video_id: string;
    saved_at: string;
    user_note: string | null;
  };
  collectionItem: null | {
    id: string;
    collection_id: string;
    video_id: string;
    position: number;
    user_note: string | null;
    visit_start: string | null;
    visit_end: string | null;
    location_id: string | null;
  };
}

export interface CollectionSummary {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  cover_image_url: string | null;
  is_curated: boolean;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  city?: string;
  country?: string;
  cover_image_url?: string;
}

/** Nested video row from GET /api/collections/:id */
export interface CollectionItemVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  caption: string | null;
  video_url: string | null;
  platform?: Platform;
}

export interface CollectionItemRow {
  id: string;
  video_id: string;
  position: number;
  user_note: string | null;
  visit_start: string | null;
  visit_end: string | null;
  video: CollectionItemVideo | null;
}

export interface CollectionDetailPayload {
  collection: CollectionSummary;
  items: CollectionItemRow[];
}

/** GET /api/map/pins — saved clips with a geocoded location. */
export interface MapPin {
  videoId: string;
  title: string;
  thumbnail_url: string | null;
  lat: number;
  lng: number;
  locationId: string;
  placeLabel: string;
  confidence: number;
}
