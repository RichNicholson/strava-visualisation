## Trend plot dot highlighting improvements

**As an** athlete
**I want** the trend plot to clearly show all runs that define any point on the rolling best line
**So that** I can identify every run that was significant at some point in time, including runs that only became the rolling best after faster earlier runs fell outside the 6-month window

### Acceptance criteria

- [x] `GIVEN` the trend plot is displayed `WHEN` I view the dots `THEN` the orange dots (best-setter runs) are at least as large as the grey background dots
- [x] `GIVEN` a run that was NOT the rolling best at its own date `WHEN` that run later becomes the rolling best (because a faster run has fallen outside the 6-month window) `THEN` the dot for that run is shown in orange at its own date position
- [x] `GIVEN` a run that never defines the rolling best at any point `WHEN` I view the chart `THEN` its dot remains grey

### Implementation notes

- **Dot size**: increase the radius of orange dots in `components/plots/LongitudinalPlot.tsx` to match or exceed the grey dot radius

- **Which dots are orange**: a run is "ever the rolling best" if its activity ID appears as the `activity` (the defining run) for any entry in the `rollingData` array — i.e. it was the fastest run in some rolling window at some date:

  ```ts
  const definingIds = new Set(rollingData.map((d) => d.activity.id))
  ```

  Then colour any dot orange if `definingIds.has(a.id)`.

- The current `bestSetters` filter (`Math.abs(d.rollingBestPace - ...) < 0.5`) approximates this but misses runs that define the line at a different date from their own. Replace with the ID-based approach above.

- The grey dots remain for all qualifying runs regardless; only the colour changes for defining runs.

## Completed

2026-03-19 — Fixed trend plot dot highlighting to correctly identify all defining runs

- Added definingActivity field to RollingBestEntry in lib/analysis/longitudinal.ts
- computeRollingBest now finds and returns the fastest activity in each window
- LongitudinalPlot uses definingIds set for accurate orange dot highlighting
- Increased orange dot radius from 3 to 5 (≥ grey dot radius of 4)
- Runs that define the rolling best at any point in time are now correctly highlighted
