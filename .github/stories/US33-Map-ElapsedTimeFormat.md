## h:mm:ss elapsed time format on map view

**Bug**: The elapsed time shown above the map displays in a `mm:ss` or `total-minutes:seconds` format for activities longer than one hour, which is misleading (e.g. `75:30` instead of `1:15:30`).

### Acceptance criteria

- [x] `GIVEN` an activity shorter than one hour `WHEN` displayed above the map `THEN` the elapsed time is shown as `m:ss` or `mm:ss` (current behaviour, unchanged)
- [x] `GIVEN` an activity one hour or longer `WHEN` displayed above the map `THEN` the elapsed time is shown as `h:mm:ss` (e.g. `1:15:30`)

## Completed

2026-03-19 — Fixed elapsed time display in RouteMap to use `h:mm:ss` for activities ≥ 1 hour.

- `components/plots/RouteMap.tsx`: replaced `Math.floor(moving_time / 60):seconds` with a formatter that emits `h:mm:ss` when `h > 0`, else `m:ss`

### Implementation notes

- Relevant component: the elapsed time label displayed above the map on the left-hand side
- The fix is purely in the display-layer formatting; the data layer stores elapsed time in seconds and is unaffected
