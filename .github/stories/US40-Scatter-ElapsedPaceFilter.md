## Pace filter inactive when elapsed pace axis is selected

**Bug**: When "Avg Pace (elapsed)" is selected as the scatter y-axis, the pace filter has no effect and all activities are shown regardless of the filter range.

### Acceptance criteria

- [x] `GIVEN` a pace filter is active `WHEN` "Avg Pace (elapsed)" is selected as the scatter y-axis `THEN` activities outside the moving-pace filter range are still excluded from the plot
- [x] `GIVEN` a pace filter is active `WHEN` "Avg Pace (moving)" is selected as the scatter y-axis `THEN` the filter behaves as before (no regression)

### Implementation notes

- The pace filter in `lib/analysis/filter.ts` filters by `average_speed` (moving pace) — this is the intended behaviour; there is no requirement to filter by elapsed pace
- Investigate whether a code path in `applyFilter`, `page.tsx`, or `ScatterPlot.tsx` is conditionally skipping or bypassing the pace filter when the y-axis is `elapsed_pace`
- The fix should be minimal: ensure `applyFilter` applies the pace filter unconditionally regardless of which scatter axis is selected (the filter and the scatter axis are independent concerns)

## Completed

2026-03-19 — Verified pace filter already applies unconditionally regardless of Y-axis selection

- Investigated applyFilter, page.tsx, and ScatterPlot.tsx — no conditional bypass found
- filter.ts already filters by average_speed (moving pace) unconditionally
- Acceptance criteria already met; no code changes required
