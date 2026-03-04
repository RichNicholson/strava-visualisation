# Codebase Summary — StravaViz

## Purpose

A privacy-first browser-only Strava visualisation tool for runners. The user connects via OAuth (handled server-side to protect the client secret), then their browser fetches activity data directly from the Strava API and stores it in IndexedDB using Dexie. No activity data ever reaches the application server. The dashboard offers two plot modes — a configurable scatter plot (with optional WMA age-grade contour lines) and a multi-activity series plot — alongside a filter sidebar for sport type, date range, distance, and pace (by average or best split over a chosen distance block).

---

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router), React 19, TypeScript 5, strict mode
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`), Geist font
- **Data layer**: Dexie 4 (IndexedDB wrapper) + `dexie-react-hooks` (`useLiveQuery`)
- **Visualisation**: D3 v7 (rendered imperatively into SVG refs inside React `useEffect`)
- **Maps**: Leaflet 1.9 + react-leaflet 5 (installed but not yet used in any source file)
- **Build**: pnpm (workspace file present; single-package project)
- **Environment variables required** (server-side only):
  - `STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`
  - `NEXT_PUBLIC_APP_URL`

---

## Structure

```
/
├── app/
│   ├── layout.tsx                  # Root layout — Geist font, metadata
│   ├── page.tsx                    # Landing/marketing page — "Connect with Strava" CTA
│   ├── globals.css                 # Tailwind v4 import + CSS custom properties
│   ├── favicon.ico
│   ├── api/
│   │   └── auth/strava/
│   │       ├── route.ts            # GET /api/auth/strava — builds Strava OAuth URL and redirects
│   │       └── callback/route.ts   # GET /api/auth/strava/callback — exchanges code, sets cookie, redirects to /dashboard
│   └── dashboard/
│       ├── page.tsx                # Main dashboard ("use client") — layout, mode toggle, filter state, plot routing
│       └── SettingsPanel.tsx       # Modal overlay — user enters age/gender for WMA contours
│
├── components/
│   ├── filter/
│   │   ├── FilterPanel.tsx         # Sidebar filter UI — sport pills, date/distance sliders, pace row
│   │   ├── PaceFilterRow.tsx       # Pace filter sub-component — average vs. best-split mode + distance picker
│   │   └── RangeSlider.tsx         # Dual-thumb range slider implemented with two overlapping <input type="range">
│   └── plots/
│       ├── AxisSelector.tsx        # <select> for choosing X/Y metric on scatter plot
│       ├── ScatterPlot.tsx         # D3 scatter plot — axes, grid, WMA contours, interactive dots, tooltip
│       └── SeriesPlot.tsx          # D3 multi-line series plot — pace/HR/elevation/cadence over distance or time
│
├── hooks/
│   ├── useActivities.ts            # useLiveQuery wrappers: useAllActivities(), useActivities(filter?), useAthlete()
│   ├── useStravaSync.ts            # Orchestrates syncActivities(); exposes { progress, isSyncing, startSync }
│   └── useStreams.ts               # useStream(id) and useStreams(ids[]) — cache-first from IndexedDB, then Strava API
│
├── lib/
│   ├── strava/
│   │   ├── client.ts               # Browser Strava API client — stravaFetch(), fetchAthlete(), fetchActivitiesPage(), fetchActivityStreams()
│   │   └── types.ts                # All shared types (StravaActivity, ActivityStream, Athlete, FilterState, MetricKey) + getMetricValue()
│   ├── db/
│   │   ├── schema.ts               # Dexie DB class "StravaViz" — tables: activities, streams, athlete
│   │   └── sync.ts                 # syncActivities() (incremental, paginated), syncStreamsForActivity() (cache-first + best-split computation), getAccessToken()
│   ├── analysis/
│   │   ├── filter.ts               # applyFilter(), getDistanceBounds(), getDateBounds(), getSportTypes() — all pure functions
│   │   └── bestSplit.ts            # computeBestSplits() (O(n) sliding window), formatPace(), parsePace()
│   └── wma/
│       └── ageGrade.ts             # WMA 2015 tables, getAgeFactor(), computeAgeGrade(), timeForAgeGrade(), generateAgeGradeContour()
│
├── public/                         # Static SVG icons only (defaults from create-next-app)
├── next.config.ts                  # Empty config (no customisation)
├── tsconfig.json                   # Strict TS; path alias @/* → ./*
├── postcss.config.mjs              # @tailwindcss/postcss only
├── pnpm-workspace.yaml             # Workspace declaration (single package)
└── package.json                    # Scripts: dev / build / start
```

---

## Key Flows

### 1. OAuth authentication

```
User clicks "Connect with Strava" (href="/api/auth/strava")
  → app/api/auth/strava/route.ts
      builds Strava OAuth URL (client_id from env, scope: read,activity:read_all)
      → 302 to strava.com/oauth/authorize

Strava redirects back to /api/auth/strava/callback?code=...
  → app/api/auth/strava/callback/route.ts
      POST to strava.com/oauth/token (client_secret stays server-side)
      sets non-httpOnly cookie: strava_access_token (expires = token expiry)
      → 302 to /dashboard
```

The token is deliberately NOT httpOnly so the browser JavaScript can read it to call Strava directly.

### 2. Activity sync (browser-side)

```
User clicks "Sync Activities"
  → useStravaSync.startSync()
      → lib/db/sync.syncActivities(token, onProgress)
          reads cookie via getAccessToken() / document.cookie
          fetchAthlete()  → db.athlete.put(...)
          finds most recent activity in IndexedDB (for incremental sync)
          loop: fetchActivitiesPage(page, 100, after?)
              → db.activities.bulkPut(batch)
          emits SyncProgress updates (phase: athlete | activities | done | error)
```

Streams are fetched lazily per-activity when the series plot is active (up to 20 at once via `useStreams`). On first fetch they are stored in `db.streams` and best splits are computed and written back to `db.activities.best_splits`.

### 3. Dashboard rendering

```
app/dashboard/page.tsx ("use client")
  useAllActivities()     → useLiveQuery → db.activities (reactive)
  useAthlete()           → useLiveQuery → db.athlete
  useStravaSync()        → progress state
  filter state           → useMemo → applyFilter(allActivities, filter)
  plotMode state         → 'scatter' | 'series'

  if scatter:
    <ScatterPlot activities={filteredActivities} athlete showWMA>
        D3 useEffect: xScale/yScale → axes → grid → [WMA contours] → circles
        WMA contours only when Y=average_pace AND X=distance AND athlete has age+sex
        generateAgeGradeContour() called per grade level (40/50/60/70/80/90%)

  if series:
    useStreams(first 20 filtered activity IDs)
    <SeriesPlot activities streams loading>
        D3 useEffect: builds Point arrays from stream data
        rolling average smoothing (default window=50 data points)
        one line per activity, Tableau10 colour scheme
```

---

## Conventions

**Naming**
- React components: PascalCase, one component per file, filename matches component name
- Hooks: `use` prefix in `hooks/` directory
- Library modules: camelCase files in `lib/` grouped by domain (`strava/`, `db/`, `analysis/`, `wma/`)
- Types: defined in `lib/strava/types.ts`; interfaces use `interface`, unions use `type`

**Error handling**
- API routes: redirect to `/?error=<slug>` on failure — no JSON error body returned to the browser
- `stravaFetch`: throws on non-OK responses; `UNAUTHORIZED` on 401
- `useStravaSync`: catches and stores error in `SyncProgress.error`; does not surface to UI beyond the progress state
- No global error boundary is present

**Testing**
- No tests exist. No test framework is installed (no vitest/jest in `package.json`).

**Config / env**
- Three env vars needed; no `.env.example` or documentation beyond the auth routes themselves
- Env vars are read directly inside route handlers with no central config module

**Component style**
- All leaf components marked `'use client'`
- D3 manipulation is entirely inside `useEffect` (SVG ref pattern); no React-D3 hybrid
- State is co-located in `dashboard/page.tsx`; no global state manager
- Tailwind classes inline, no CSS modules or styled-components

**Data layer**
- Dexie `db` singleton in `lib/db/schema.ts`, imported directly wherever needed — no dependency injection
- `useLiveQuery` makes reads reactive to IndexedDB writes automatically

---

## Watch Out For

1. **No token refresh.** The access token is stored in a cookie with `maxAge = expires_at - now`. When it expires the user sees silent failures — `useStravaSync` will catch a thrown `UNAUTHORIZED` error but the UI just shows the error in progress state (no prompt to re-authenticate).

2. **`useStreams` dependency array hack.** In `hooks/useStreams.ts` line 83, the dependency array is `[activityIds.join(',')]` with an eslint-disable comment. This means the effect does not re-run if the array length stays the same but ids change (unlikely in practice but fragile).

3. **WMA factors are sampled/approximated.** `lib/wma/ageGrade.ts` states the table is "simplified representative factors" sampled at 5-year age intervals. The comment acknowledges this. Anyone extending or validating the WMA contours should verify against the full 2015 tables.

4. **Leaflet is installed but unused.** `leaflet` and `react-leaflet` are in `dependencies` with no usage anywhere in the source. This suggests a map view for route plotting was planned but not started.

5. **Stream sync does not parallelise.** `syncStreamsForActivity` is called one at a time inside `Promise.all` in `useStreams` — which is actually parallel — but each call hits Strava's API sequentially if not cached. Rate limiting is not handled.

6. **No `.env.example`.** The three required environment variables (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`) are not documented outside the source code.

7. **`next-env.d.ts` and `.next/` in `tsconfig.include`.** Standard Next.js setup, but worth knowing the `.next/dev/types/**/*.ts` pattern is included, so the `.next` build directory affects type checking.

8. **`age` is optional on `Athlete`.** WMA contours silently do not render if the user has not set their age in Settings. There is no nudge in the UI to do so.

---

## Where to Start

**Core domain logic:** `lib/strava/types.ts` (all types), `lib/db/schema.ts` (DB shape), `lib/db/sync.ts` (sync engine)

**UI entry points:** `app/dashboard/page.tsx` (orchestration), `components/plots/ScatterPlot.tsx` and `SeriesPlot.tsx` (the main visuals)

**Filtering:** `lib/analysis/filter.ts` (pure logic), `components/filter/FilterPanel.tsx` + `PaceFilterRow.tsx` (UI)

**WMA / age grade:** `lib/wma/ageGrade.ts` entirely self-contained

**Auth:** `app/api/auth/strava/route.ts` and `callback/route.ts` — simple two-file OAuth flow

**Safe to ignore:** `public/` (stock SVGs), `postcss.config.mjs`, `pnpm-workspace.yaml`, `next.config.ts` (empty), `app/globals.css` (minimal)

**Not yet implemented (planned):** Map/route view (Leaflet dependency exists, no component), token refresh, test suite
