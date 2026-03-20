# Project overview

A personal Strava activity visualisation tool built with Next.js 15 (App Router). It pulls activity data from the Strava API and stores it locally in the browser via Dexie (IndexedDB), with no server-side database. All data processing and filtering happens client-side.

## Tech stack

- **Framework**: Next.js 15 (App Router), React 19
- **Database**: Dexie v4 (IndexedDB) — all persistent state lives here, in the browser
- **Visualisation**: D3 v7, Leaflet / react-leaflet
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest — run with `pnpm test`
- **Language**: TypeScript throughout; strict mode enabled

## Architecture

```
app/               Next.js pages and API routes
  api/auth/strava/ OAuth redirect and callback handlers
  dashboard/       Main view — all client-side
components/        Presentational components grouped by concern
  filter/          Filter controls (FilterPanel, presets, sliders)
  plots/           D3/Leaflet visualisations (ScatterPlot, SeriesPlot, RouteMap)
  roster/          Activity roster (pinned set for comparison)
  table/           ActivityTable
hooks/             React hooks wrapping Dexie queries and sync logic
lib/
  analysis/        Pure functions (filter, bestSplit) — tested with Vitest
  db/              Dexie schema and sync logic
  strava/          API client and shared TypeScript types
  wma/             World Masters Athletics age-grading tables and logic
```

## Key conventions

- **All dashboard code is client-side** (`'use client'`). API routes exist only for OAuth; there is no server-side data layer.
- **Dexie hooks** (`useLiveQuery`) are used inside `hooks/` wrappers — avoid calling them directly from components.
- **Filtering is a pure function** — `applyFilter(activities, filter)` in `lib/analysis/filter.ts`. Keep it side-effect free.
- **Units**: distances are in **metres**, speeds in **m/s**, times in **seconds**, pace in **seconds per km** throughout the data layer. Convert only at the display layer.
- **Colours**: use the `TABLEAU10` palette (d3.schemeTableau10) for activity/series colours; do not introduce other colour schemes.
- **Types** are centralised in `lib/strava/types.ts` — add new shared types there.

## Data model

- `StravaActivity` — synced from Strava, stored in `db.activities`
- `ActivityStream` — per-activity time-series data (GPS, HR, pace), keyed by `activityId`, stored in `db.streams`
- `Athlete` — single record holding profile info and OAuth tokens
- `FilterState` — transient UI state, not persisted to Dexie

## Testing

Tests live alongside source files (`*.test.ts`). Only pure logic in `lib/` is unit-tested. Use Vitest; do not use Jest.

```bash
pnpm test        # run all tests once
```

## Environment variables

| Variable | Purpose |
|---|---|
| `STRAVA_CLIENT_ID` | Strava OAuth app ID |
| `STRAVA_CLIENT_SECRET` | Strava OAuth secret |
| `NEXT_PUBLIC_APP_URL` | Base URL used to construct the OAuth callback URI |

These must be set in `.env.local`. Never commit them.

## Things to avoid

- Do not add a server-side database — the intentional design is local-first via IndexedDB.
- Do not introduce new global state libraries (Redux, Zustand, etc.); use React state + Dexie live queries.
- Do not add Strava API calls from the browser directly — go through the OAuth token stored in Dexie and the existing `lib/strava/client.ts`.
- Do not convert units inside `lib/` — keep the data layer in SI units and convert in components.
