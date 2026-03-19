## Best split curve (series mode)

**As an** athlete
**I want** to see the best split curve for each rostered run
**So that** I can identify the fastest pace I sustained over any given distance (e.g. "my fastest kilometre was 3:55/km")

### Acceptance criteria

- [x] `GIVEN` one or more runs are rostered `WHEN` I select the "Best split" Y-metric in the series plot `THEN` the plot shows one curve per run
- [x] `GIVEN` the best split plot is displayed `WHEN` I read the axes `THEN` the x-axis shows distance window size (e.g. 100 m → full run distance) and the y-axis shows the best average pace achieved over a contiguous block of that length
- [x] `GIVEN` the value at 1 km is 3:55 min/km `WHEN` I read the chart `THEN` this means the fastest contiguous 1 km segment in the run averaged 3:55/km
- [x] `GIVEN` a curve is displayed `WHEN` I hover over a point `THEN` a tooltip shows the run name, the window distance, and the best pace for that window
- [x] `GIVEN` I switch to a different Y-metric `WHEN` the plot renders `THEN` it reverts to the standard series view

### Implementation notes

- **X-axis**: uses the standard series plot x-axis (distance or time). The x-value represents the window size (e.g. "1 km"), and the y-value is the best average pace achieved over any contiguous block of that length within the run — not the pace at a specific point. This is a different semantic from other series modes but shares the same axis controls.
- Algorithm: for each window size d (sampled at stream resolution), slide a window of width d across the GPS stream and find the minimum average pace (maximum average speed). This is O(n²) naively — a sliding-window approach over the cumulative distance array is more efficient.
- Compute in `lib/analysis/` as a pure function for testability; input is the pace/distance stream, output is `{windowDistance: number, bestPace: number}[]`
- Display pace in the user's preferred unit (min/km or min/mile)
- X-axis range: from the minimum meaningful window (e.g. 100 m or the stream resolution) to the shortest run distance in the roster (longer windows are undefined for shorter runs)
- Use TABLEAU10 colours per run, consistent with other series modes
- Curves will tend to decrease as window size increases (harder to sustain a fast pace over longer distances) — this is the expected shape

## Completed

2026-03-19: Implemented `computeBestSplitCurve` in `lib/analysis/bestSplit.ts`, added `'bestsplit'` to `SeriesMetric` in `lib/strava/types.ts`, and added the rendering path with tooltip and axis controls to `components/plots/SeriesPlot.tsx`. X/time mode controls are hidden in best split mode. Six new unit tests added to `lib/analysis/bestSplit.test.ts`.
