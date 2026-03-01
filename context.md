# Roamly — Development Context

Reference for developers and LLMs working on this codebase. Full product vision and MVP definition: [project.md](project.md).

---

## Project goal

Roamly is a geo-spatial discovery platform that turns short-form social media travel videos (TikTok, Instagram, etc.) into **structured, map-based, actionable itineraries**. It targets independent travelers who experience planning fatigue and want “hidden gems” from social without manual cross-platform research. Value: ~50% less research time; inspiration and logistics in one place.

**MVP scope:** Import content → See accurate map pins → Build itinerary. Core loop: **Parsing → Structuring → Mapping → Itinerary conversion.**

**Explicit non-goals (out of scope for MVP):** No booking engine, in-app video hosting, social features, full AI itineraries, offline maps, flight/hotel engines, rewards, creator marketplace.

---

## How to run

- **Prerequisites:** Node.js and npm (e.g. via nvm).
- **Install:** `npm i`
- **Dev server:** `npm run dev` — Vite dev server; from [vite.config.ts](vite.config.ts): `host: "::"`, **port 8080**, HMR with overlay disabled.
- **Build:** `npm run build` (production); `npm run build:dev` (development mode).
- **Preview:** `npm run preview` (serve production build locally).
- **Tests:** `npm run test` (Vitest run once); `npm run test:watch` (watch). Test setup: [src/test/setup.ts](src/test/setup.ts) (jsdom, matchMedia mock); [vitest.config.ts](vitest.config.ts).

No environment variables are used in the repo today; no `.env` setup required for local run.

---

## Tech stack & dependencies

- **Runtime:** React 18, React Router v6, TanStack Query, Leaflet (maps), Framer Motion, date-fns, Zod, react-hook-form + @hookform/resolvers, Radix UI (via shadcn), Tailwind CSS, Lucide icons, Recharts, Sonner/Toaster.
- **Build/tooling:** Vite, TypeScript, SWC (Vite React plugin), PostCSS, Autoprefixer, Tailwind, ESLint. Optional in dev: **lovable-tagger** (component tagging) in [vite.config.ts](vite.config.ts).
- **Testing:** Vitest, Testing Library (React + Jest-DOM), jsdom.
- **Path alias:** `@` → `./src` (tsconfig and Vite).

Full versions: [package.json](package.json).

---

## Codebase structure & routing

- **Entry:** [src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx) (QueryClient, TooltipProvider, Toaster, Sonner, BrowserRouter, Navbar, Routes).

| Path | Page component |
|------|----------------|
| `/` | Index |
| `/explore` | Explore |
| `/map` | MapPage |
| `/collections` | Collections |
| `/onboarding` | Onboarding |
| `/sync` | ContentSync |
| `/processing` | Processing |
| `/trip/:city` | TripMap |
| `/itinerary` | ItineraryPage |
| `/passport` | Passport |
| `/sync-error` | SyncError |
| `/no-results` | NoResults |
| `*` | NotFound |

- **src/pages/** — One component per route; implement screens and pull from `src/data` or components.
- **src/components/** — Shared UI: Navbar, MapView, VideoCard, CollectionCard, plus **src/components/ui/** (shadcn primitives).
- **src/data/** — All current “backend”: types and mock data.
- **src/hooks/** — e.g. use-toast, use-mobile.
- **src/lib/** — Utils (e.g. `cn`).

---

## Data & types

- **Core types** in [src/data/mockData.ts](src/data/mockData.ts): `Video`, `Location`, `Collection`; exports `mockVideos`, `mockLocations`, `mockCollections`, `categories`.
- **Barcelona-specific** in [src/data/barcelonaData.ts](src/data/barcelonaData.ts): `barcelonaLocations`, `barcelonaVideos`, `curatedFeed`; also **ItineraryItem**, **PassportEntry**, `mockItinerary`, `mockPassport`. Barcelona data reuses `Video` and `Location` from mockData.
- **Usage:**
  - Global map and explore: [MapView](src/components/MapView.tsx) and [Explore](src/pages/Explore.tsx) use `mockVideos` / mockData.
  - City trip map: [TripMap](src/pages/TripMap.tsx) and itinerary/passport flows use barcelonaData (Barcelona only; `/trip/:city` param not yet wired to other cities).
- **Map tiles:** Leaflet with CARTO Voyager in MapView and TripMap (no API key in repo).

---

## UI & styling

- **Design system:** shadcn/ui (Radix + Tailwind), configured in [components.json](components.json); theme via CSS variables in [src/index.css](src/index.css) (e.g. `--primary`, `--coral`, `--radius`).
- **Fonts:** DM Sans (body), Playfair Display (display) — loaded in index.css.
- **Tailwind:** [tailwind.config.ts](tailwind.config.ts) extends theme (container, fonts, colors from CSS vars, etc.). Content paths include `./src/**/*.{ts,tsx}` and others.

---

## Implementation notes

- **Index hero:** [Index.tsx](src/pages/Index.tsx) imports `heroBg` from `@/assets/hero-bg.jpg`. Ensure this asset exists or handle a missing image to avoid runtime errors.
- **Maps:** Two Leaflet usages — MapView (global pins from mockVideos) and TripMap (Barcelona pins + slide-out panel “Add to Itinerary”). Both use custom div icons and CARTO tiles.
- **Itinerary export:** [Itinerary](src/pages/Itinerary.tsx) builds a Google Maps directions URL (origin, destination, waypoints) from itinerary locations and opens it in a new tab.
- **Auth:** No real auth; “Sign In” in [Navbar](src/components/Navbar.tsx) is UI only.
- **Lovable:** Project is Lovable-managed (README); optional lovable-tagger in Vite dev only.
