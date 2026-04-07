
Here’s a tight way to **reshape the concept** around discovery + storage + serendipity for people **in** or **heading to** a place—without pretending you’re a full TikTok clone.

### Core promise (one sentence)
**“Help me notice and keep the places I’d actually go—curated from real-world signals, not generic top-10 lists.”**

That frames you as **discovery + memory** (save, revisit, trip-build), not “infinite feed.”

---

### What to emphasize vs. de-emphasize

| Emphasize | De-emphasize |
|-----------|----------------|
| **Place-first** (neighborhood, city, “near me”) | Creator-first endless scroll |
| **Saved lists & trip containers** | Vanity metrics as the goal |
| **Lightweight “why here”** (one line, vibe tag, time-of-day) | Long blog-style content |
| **Serendipity controls** (surprise me, but bounded) | Random global feed |

---

### Product pillars (three loops)

1. **Orient (“I’m going to X”)**  
   User picks **destination + dates + vibe** (food, quiet, nature, locals-only energy). You show **a small set of high-signal spots** (from your corpus + rules), not 500 pins.

2. **Discover (“surprise me, but smart”)**  
   **Serendipity** works when it’s **constrained**: same neighborhood, same afternoon, same budget, “15-minute walk from hotel,” “rainy day,” “solo / with kids.”  
   Mechanically: **shuffle within filters**, “**one hidden gem per day**,” or “**3 cards—pick one**” to reduce overwhelm.

3. **Store (“remember this for the trip”)**  
   One tap: **Save to trip**, **Save to map list**, **Add to day N**. Later: **Passport / check-in** (you already have the metaphor) = emotional closure + memory, not just a bookmark.

---

### “Hidden gems” without fake authority

- Prefer **signals**: recency, diversity of sources, geographic spread, “off main drag,” time windows, repeat mentions in *local* context—whatever you can support honestly.  
- Label clearly: **“Community picks”**, **“Editor picks”**, **“Matches your filters”**—not “secret locals only” unless you can back it up.  
- Let users **down-rank chains / tourist traps** with filters (“hide major landmarks,” “max popularity score”).

---

### How this maps to what you’re already building

- **Explore** → destination + intent + **bounded** serendipity (shuffle / daily gem).  
- **Map** → trip layer: saved + suggested, not every POI on earth.  
- **Collections** → **trips / lists** (“Barcelona long weekend,” “Rainy Tuesday”).  
- **Itinerary** → order + time + distance (you’re already close with mock flow).  
- **Passport** → “I went here” + note/photo—**memory**, great for retention after the trip.

---

### Differentiation in one line for users

**“Not another listicle app—a trip-aware map of saves and surprises, built so you actually use it on the ground.”**

---

### Optional next step (concept only)

Write **three personas** (e.g. first-time city break, slow travel two weeks, business traveler with two free evenings) and for each define: **one screen**, **one serendipity rule**, **one save action**. That forces the product to stay **helpful** instead of **feature-heavy**.

If you want this tied directly to **your** Trove codebase (which screens to change first, what to rename), say whether you care more about **web**, **mobile**, or **both** and I’ll align the suggestion to that stack only.

**NEW CONCEPT**

You log into your instagram account in our website and are able to send videos that you are interested in to our website. Once there, we help to organize these videos into coherent visiting strategies and provide a serendipitous travel assistant that helps you find other local gems visited by others near you

Core UX is organizing inspiration for travel, the viable framing is: “Save links + context (why, where, when) + map/itinerary”, with playback delegated to the source or embed where allowed.


Below is an **implementation plan** tailored to your stack (**Expo mobile + Vite web**, **Supabase auth**, **existing collections/map/itinerary metaphors**). It stays within the **bookmark + context + map/itinerary** framing, with **playback delegated** to the source.

---

## 1. Product scope (MVP vs later)

**MVP (ship first)**  
- Signed-in users **add a link** (paste + optional “Add from share sheet” on mobile where feasible).  
- You **normalize URL**, **fetch metadata** (title, thumbnail, site name) server-side, user adds **why / where / when** (free text + optional place picker).  
- **Collections** = trips or themes; **map** = pins for items with coordinates; **list** = default view.  
- **Play** = **open in Instagram/TikTok** (deep link / browser) or **WebView** only if embed is reliable and policy-safe.

**Phase 2**  
- **Share extension** (iOS) / **Android share target** so “Share → Trove” sends the URL into the app without paste.  
- **Better place resolution** (Mapbox/Google Places from user search, not from video).  
- **Itinerary**: order stops, day buckets, rough travel time (client-side or API).

**Phase 3**  
- **Collaborative collections**, import CSV, public read-only trip links.

---

## 2. Data model (backend / Supabase)

**Table: `saved_links` (or `travel_inspiration`)**  
- `id`, `user_id` (FK to `public.users` / Supabase `auth.users`)  
- `url` (text, unique per user optional)  
- `canonical_url` / `platform` (`instagram` | `tiktok` | `other`)  
- `title`, `description`, `thumbnail_url` (from unfurl/oEmbed)  
- `note` (“why”)  
- `visit_window` (“when”) — e.g. date range or text  
- `place_name`, `lat`, `lng` (nullable until user picks a place)  
- `collection_id` (nullable FK to existing **collections** if you align with current API)  
- `sort_order` / `day_index` for itinerary  
- `created_at`, `updated_at`

**Optional: `collections` extension**  
- If your backend already has collections, either **attach links to collections** or keep **inspiration** separate and “add to trip” copies/links the row.

**RLS (Supabase)**  
- `user_id = auth.uid()` for select/insert/update/delete.

---

## 3. Link ingestion pipeline

**Client**  
- Single field: **paste URL** + **Submit**.  
- Optional: on mobile, **receive shared text** that contains a URL (intent / share extension in Phase 2).

**Server (recommended)**  
- `POST /api/inspiration` or `POST /api/saved-links` with `{ url, collectionId?, note?, place? }`.  
- Server:  
  1. **Validate** URL (scheme, allowlist hosts: `instagram.com`, `tiktok.com`, `vm.tiktok.com`, etc.).  
  2. **Normalize** (strip tracking params, resolve short links if safe with timeout + size limits).  
  3. **Unfurl**: call **oEmbed** where available (Instagram/TikTok have had oEmbed endpoints; behavior changes—abstract behind `unfurlService`).  
  4. Fallback: **Open Graph** / basic HTML parse for `og:title`, `og:image`.  
  5. Store row + return DTO to client.

**Why server-side**  
- Hides API keys if any, avoids CORS, consistent caching, rate limits, and one place to patch when Meta/TikTok change behavior.

---

## 4. Mobile (Expo) — screens & flow

1. **Auth** (you have this): gate “Save” and “My inspiration.”  
2. **Add link** screen: TextInput (URL), multiline “Why”, optional date chips, **“Choose on map”** or **search place** (Phase 1 can be text-only place name).  
3. **Inspiration list**: FlatList grouped by collection or date added; filter by platform.  
4. **Detail** screen: thumbnail, title, note, place, **Open in Instagram/TikTok** button, **Edit**, **Add to trip**.  
5. **Map** tab: markers for items with `lat/lng`; tap → detail.  
6. **Trip / itinerary** (reuse tab): ordered list; drag-to-reorder (later) or “Move to day 2.”

**Share sheet (Phase 2)**  
- **iOS Share Extension** is a separate target (not trivial in Expo; often **prebuild** + native module or third-party).  
- **Android**: intent filters in **app config** to receive `ACTION_SEND` `text/plain`.  
- MVP: **paste** + in-app **“Copied link detected”** clipboard banner (optional, privacy-sensitive—ask permission).

---

## 5. Web (Vite) — parity

- Same API; pages: **Add**, **Library**, **Detail**, **Map** (Leaflet like you have), **Trip builder**.  
- **Bookmarklet** (optional): `javascript:` that opens your site with `?url=` encoded—low friction for desktop users.

---

## 6. Visualization & “organize”

- **Collections** = trips; filter map by active trip.  
- **Serendipity (lightweight)**: “Suggest reorder by neighborhood” = cluster by `lat/lng` k-means or sort by distance from a “home base” pin (user sets once per trip).  
- **No need to own video** for any of this—cards are **rich links**.

---

## 7. Legal / UX copy

- Onboarding line: **“Trove saves links and your notes; video plays in the original app or site.”**  
- ToS: users warrant they’re not bulk-scraping; you store **references**, not claimed ownership of media.

---

## 8. Suggested build order (2–4 week slices)

| Week | Web + API | Mobile |
|------|-----------|--------|
| 1 | DB + RLS + `POST/GET/PATCH/DELETE` saved links; minimal unfurl | Add link + list + detail; open external URL |
| 2 | Attach to existing `collections` API or new `trip_id` | Map markers for geotagged items |
| 3 | Place search (one provider) + write `lat/lng` | Same + polish |
| 4 | Itinerary ordering + export/share trip | Share intent / extension spike |

---

## 9. What you’re *not* building in this plan

- Bulk “import my TikTok likes.”  
- Permanent re-hosting of IG/TikTok video files.  
- Relying on unofficial scrapers.

---

If you want this **mapped file-by-file** to your repo next (e.g. `backend/src/routes/...`, `mobile/app/(tabs)/...`, `src/pages/...`), switch to **Agent mode** and say whether **database is Supabase-only** or **Postgres via your Express `backend/`** so the plan matches where migrations live.