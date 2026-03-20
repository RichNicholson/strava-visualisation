## Series plot defaults and manual autoscale

**As an** athlete  
**I want** the series plot to default to cumulative pace on the y-axis and moving time on the x-axis, and only rescale when I explicitly press the autoscale button  
**So that** switching between metrics or time modes does not unexpectedly jump the axis range and lose my context

### Acceptance criteria

- [ ] `GIVEN` the dashboard loads and the series plot is shown for the first time `WHEN` no prior interaction has occurred `THEN` the y-axis metric is "Cumulative Pace" and the x-axis time mode is "Moving"
- [ ] `GIVEN` the y-axis is zoomed or panned to a custom range `WHEN` I switch from cumulative pace to rolling pace (or any other y-metric change) `THEN` the y-axis range does **not** automatically reset — it retains the current view domain
- [ ] `GIVEN` the y-axis is at a custom range `WHEN` I switch the x-axis between moving time and elapsed time `THEN` the y-axis range does **not** automatically reset
- [ ] `GIVEN` the y-axis is at a stale range after a metric change `WHEN` I click the autoscale button `THEN` the y-axis rescales to fit the current data with padding
- [ ] `GIVEN` the series plot renders `WHEN` I look at the autoscale button `THEN` it is clearly visible in the plot header area (consistent with the scatter plot's autoscale button placement)

### Implementation notes

- Relevant files: `components/plots/SeriesPlot.tsx`
- Currently `yViewDomain` resets to `null` when `yMetric`, `xMetric`, or `timeMode` changes — remove those resets
- Change initial `yMetric` default from the current value to `'cumulative_pace'` and initial `timeMode` to `'moving'`
- The autoscale button already exists; ensure it is the **only** way to trigger a y-domain refit (besides initial render)

## Completed

2026-03-08: Changed `yMetric` default from `'rolling'` to `'cumulative'` and removed the `useEffect` that reset `yViewDomain` on every metric/mode change. Switching metric, x-axis, or time mode no longer resets the y zoom; only the Auto-scale button triggers a refit. Verified with 5 Playwright E2E tests (`e2e/series-defaults.spec.ts`).
