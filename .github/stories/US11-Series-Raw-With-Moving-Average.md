## Remove smoothing from series plot

**As an** athlete  
**I want** the series plot to show raw data with a rolling average overlay instead of smoothed lines  
**So that** I can see actual pace variation while still spotting trends

### Acceptance criteria

- [ ] `GIVEN` a run is in the roster `WHEN` the series plot renders `THEN` the raw data line is not smoothed — it reflects point-by-point stream values
- [ ] `GIVEN` the plot renders `WHEN` I view the pace series `THEN` a rolling average line (0.25 mile / ~400 m window) is overlaid in a visually distinct style (e.g. thicker, slightly transparent)
- [ ] The first ~160 m (0.1 miles) of data is excluded from the plot to avoid noisy GPS startup artefacts
- [ ] `GIVEN` x-axis is set to distance `WHEN` the plot renders `THEN` the x-axis starts at ~0.16 km, not 0 km

### Implementation notes

- Relevant files: `components/plots/SeriesPlot.tsx` (remove `rollingAvg` usage on the main line; add a separate rolling-average overlay; trim the first ~160 m of stream data)
- The current `rollingAvg` function can be reused for the overlay — just remove it from the primary line
- 0.25 miles ≈ 400 m; use distance stream values (in metres) to determine window size in data points
- Rolling average window should be based on distance, not a fixed number of points

## Completed

2026-03-07 — Replaced fixed-index rolling average with a distance-based (400 m / ~0.25 mi) sliding-window overlay; raw data (no smoothing) is now drawn as a thin background line for all metrics including cumulative pace; first 160 m of each stream is trimmed and the distance x-axis domain starts at 160 m.
