## Unit preference in settings

**As an** athlete  
**I want** to choose between kilometres and miles in the settings  
**So that** distances and paces are displayed in my preferred unit system

### Acceptance criteria

- [x] `GIVEN` I open the settings panel `WHEN` I view the options `THEN` there is a unit toggle for km vs miles
- [x] `GIVEN` I select miles `WHEN` I view the activity table, scatter plot, and series plot `THEN` distances show in miles and paces show in min/mile
- [x] `GIVEN` I select km (default) `WHEN` I view any display `THEN` distances show in km and paces show in min/km
- [x] The unit preference is persisted in the athlete record in Dexie and restored on page reload
- [x] All data in `lib/` remains in SI units (metres, m/s, s/km) — conversion happens only in display components

## Completed

2026-03-12 — All AC implemented and unit-tested.

- Added `lib/format.ts` with `formatDistance`, `formatPace`, `metresToDisplayUnit`, `paceToDisplayUnit`, `distanceUnit`, `paceUnit` (12 unit tests)
- Added `units?: 'metric' | 'imperial'` to `Athlete` interface in `lib/strava/types.ts`
- Added km/miles toggle to `SettingsPanel.tsx`; persisted via `db.athlete.update()`
- Wired `units` prop through `page.tsx` to `ActivityTable`, `ScatterPlot`, `SeriesPlot`
- All three display components updated to use unit-aware formatters; lib/ untouched

### Implementation notes

- Relevant files: `lib/strava/types.ts` (add optional `units?: 'metric' | 'imperial'` to `Athlete`), `app/dashboard/SettingsPanel.tsx` (add toggle), `components/` (update display formatting in table, plots)
- Do NOT change any logic in `lib/analysis/` or `lib/wma/` — conversion is purely a display concern
- Consider a shared `formatDistance(metres, unit)` and `formatPace(sPerkm, unit)` utility in a new `lib/format.ts` or in components
