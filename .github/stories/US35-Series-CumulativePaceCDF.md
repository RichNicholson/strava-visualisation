## Cumulative pace distribution plot (series mode)

**As an** athlete
**I want** to see the cumulative distribution of pace for each rostered run
**So that** I can understand what fraction of a run was spent at or below a given pace, enabling fair cross-run comparisons

### Acceptance criteria

- [x] `GIVEN` one or more runs are rostered `WHEN` I select the "Pace CDF" Y-metric in the series plot `THEN` the plot shows one curve per run
- [x] `GIVEN` the CDF is displayed `WHEN` I read the axes `THEN` the x-axis shows pace (from slow on the left to fast on the right) and the y-axis shows the cumulative percentage (0–100 %) of activity time spent at or below that pace
- [x] `GIVEN` a curve is displayed `WHEN` I hover over it `THEN` a tooltip shows the run name, the pace at the cursor, and the corresponding cumulative percentage
- [x] `GIVEN` I switch to a different Y-metric `WHEN` the plot renders `THEN` it reverts to the standard time/distance x-axis and the CDF curves are gone

### Implementation notes

- **X-axis note**: unlike other series modes, the CDF x-axis is pace (not time or distance). This is a special case — the plot controls should handle the CDF mode distinctly and not offer time/distance x-axis toggling while in this mode.
- Compute the CDF from the pace stream: sort all pace samples (in s/km), then for each pace value compute the fraction of total time (or distance) with pace ≤ that value
- Keep the computation in `lib/analysis/` as a pure function for testability
- Display pace on the x-axis using the user's unit preference (min/km or min/mile) — convert only at display time
- Use TABLEAU10 colours per run, consistent with other series modes
- The x-axis should go from slowest to fastest (left to right) so that the CDF is an increasing curve — this is the conventional CDF orientation

## Completed

2026-03-19: Implemented `computePaceCDF` pure function in `lib/analysis/paceCDF.ts` with duration-weighted sampling and pace filtering. Added `'pacecdf'` to `SeriesMetric` union in `lib/strava/types.ts`. Updated `SeriesPlot.tsx` with dedicated CDF rendering branch, pace x-axis in user's unit preference, 0–100% y-axis, per-run TABLEAU10 colours, and an interactive tooltip showing run name, pace, and cumulative %. The X-axis metric toggle is hidden when in Pace CDF mode. Unit tests added in `lib/analysis/paceCDF.test.ts`.
