## Pareto front rings invisible in dark mode

**Bug**: In dark mode, the rings drawn around Pareto-optimal scatter points use a dark stroke colour, making them invisible against the dark background.

### Acceptance criteria

- [x] `GIVEN` dark mode is active `WHEN` the scatter plot renders Pareto-optimal points `THEN` the ring around each point is clearly visible against the dark background
- [x] `GIVEN` light mode is active `WHEN` the scatter plot renders Pareto-optimal points `THEN` the rings appear as before (no regression)

### Implementation notes

- The Pareto front rings are SVG `<circle>` elements (stroke, no fill) rendered in `components/plots/ScatterPlot.tsx`
- The `isDark` prop is already available in the component; use it to switch the ring stroke colour, e.g. `isDark ? '#e5e7eb' : '#1f2937'` (light gray in dark mode, dark gray in light mode)

## Completed

2026-03-19 — Fixed Pareto front ring stroke colour for dark mode

- Changed ring stroke from hardcoded '#1f2937' to isDark ? '#e5e7eb' : '#1f2937'
- Rings now clearly visible in dark mode (light gray) and light mode (dark gray)
