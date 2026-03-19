## Longitudinal best time plot

**As an** athlete
**I want** to see how my best time for a target distance (e.g. 5 km, 10 km) has changed over time using a rolling window
**So that** I can track trends in fitness and identify when I was at peak form for a given event

### Acceptance criteria

- [x] `GIVEN` I open the longitudinal best time tile `WHEN` I select a target distance (e.g. 5 km) `THEN` the plot shows a point for each rolling window representing the pace of the fastest qualifying run in that window
- [x] `GIVEN` a target distance is selected `WHEN` the plot filters runs `THEN` only runs of at least (target distance − 300 m) qualify (a 300 m leeway for short-course events)
- [x] `GIVEN` the plot renders `WHEN` I read the axes `THEN` the x-axis is date and the y-axis is pace (in the user's preferred unit)
- [x] `GIVEN` a rolling window size is selected (default: 6 months) `WHEN` the plot renders `THEN` each x-position shows the best pace from any qualifying run within the preceding window
- [x] `GIVEN` I hover over a data point `WHEN` the tooltip shows `THEN` I can see the run name, date, pace, and distance
- [x] `GIVEN` I change the target distance or rolling window `WHEN` the plot updates `THEN` the curve recalculates immediately
- [x] Available target distances include at least: 5 km, 10 km, half marathon (21.1 km), marathon (42.2 km)
- [x] The rolling window size is configurable (options: 3 months, 6 months, 12 months, All time)

### Implementation notes

- This is a new tile type — similar to scatter in that it plots one point per run, but the x-axis is always date and the y-axis is always pace, with additional filtering and rolling-window logic
- The rolling window produces a line/step curve (one value per qualifying run date), not a point per activity — consider whether to draw it as a stepped line or to plot individual qualifying run points with a trend line overlay
- Consider allowing multiple target distances to be shown simultaneously (one line per distance, TABLEAU10 colours) — but a single-distance selector is sufficient for the initial story
- Relevant files: a new tile component (e.g. `components/plots/LongitudinalPlot.tsx`), `lib/analysis/` (pure rolling-best function), and `app/dashboard/page.tsx` for wiring
- Keep the rolling-best calculation pure and unit-testable
- The y-axis should follow the scatter/series convention: faster pace at the top (lower s/km value = higher on axis)

## Completed

2026-03-19 — All AC implemented and unit-tested.

- Added `lib/analysis/longitudinal.ts` with `computeRollingBest()` — pure function, no side effects
- Added `lib/analysis/longitudinal.test.ts` with 6 unit tests covering: empty results, 300 m leeway, sort order, rolling best calculation, all-time window, and window exclusion
- Added `lib/format.ts` with `UnitSystem`, `formatPace`, `formatDistance`, `paceToDisplayUnit`, `paceUnit`, `distanceUnit`, `metresToDisplayUnit`
- Added `units?: 'metric' | 'imperial'` to `Athlete` interface in `lib/strava/types.ts`
- Created `components/plots/LongitudinalPlot.tsx` — self-contained with distance selector (5k/10k/HM/M) and window selector (3m/6m/12m/All); renders individual qualifying run dots (grey) and rolling best step curve (orange); tooltip shows name, date, distance, pace, rolling best
- Added `'longitudinal'` to `PlotMode` union and `MODE_LABELS` in `app/dashboard/page.tsx`; added "Trend" tab to mode toggle; renders `<LongitudinalPlot activities={allActivities} units={...} />` passing all activities (not filtered/rostered)
