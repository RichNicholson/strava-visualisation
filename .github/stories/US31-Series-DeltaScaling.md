## Y-axis scale presets for time delta view

**As an** athlete
**I want** the time delta plot to offer the same y-axis scale presets as the other series plot modes
**So that** I can zoom to a useful range (e.g. ±1 min, ±2 min) without manually adjusting the axis

### Acceptance criteria

- [x] `GIVEN` the series plot is in delta (Δ) mode `WHEN` the controls are visible `THEN` y-axis scale preset buttons are shown (e.g. ±30 s, ±1 min, ±2 min, Auto)
- [x] `GIVEN` I click a scale preset `WHEN` the plot renders `THEN` the y-axis is fixed symmetrically around zero at the selected range
- [x] `GIVEN` I select Auto `WHEN` the plot renders `THEN` the y-axis scales to fit the visible delta data
- [x] `GIVEN` I switch from delta mode to another Y-metric `WHEN` the series plot renders `THEN` the delta scale presets are no longer shown and the normal scale controls apply

### Implementation notes

- Relevant file: `components/plots/SeriesPlot.tsx`
- The existing pace/elevation modes have scale preset controls — replicate this pattern for delta mode
- Delta y-axis is always symmetric around zero (positive = behind baseline, negative = ahead), so presets should be ±N rather than one-sided ranges
- Sensible preset values: ±30 s, ±1 min, ±2 min, ±5 min, Auto — review what the other modes offer and stay consistent

## Completed

2026-03-19 — Added `deltaScaleMode` state and symmetric scale preset buttons (±30 s, ±1 min, ±2 min, ±5 min, Auto) to the delta view in SeriesPlot.

- Added `deltaScaleMode` state (`auto` | `30s` | `1min` | `2min` | `5min`)
- Delta rendering path now conditionally sets y-domain to fixed symmetric range or auto-fit
- Scale preset buttons render in place of the standard pace scale buttons when in delta mode
- Added `deltaScaleMode` to D3 useEffect dep array
