## Time delta plot

**As an** athlete  
**I want** to select a baseline run and see a time-delta or distance-delta line for each other rostered run  
**So that** I can visualise exactly where I gained or lost time compared to a reference performance

### Acceptance criteria

- [ ] `GIVEN` two or more runs are in the roster `WHEN` I view the series plot `THEN` I can designate one run as the "baseline" via a control (e.g. a radio button or dropdown in the roster or plot header)
- [ ] `GIVEN` a baseline is selected and x-axis is distance `WHEN` the plot renders `THEN` each non-baseline run shows a line representing the cumulative time delta (positive = behind baseline, negative = ahead) at each distance point
- [ ] `GIVEN` a baseline is selected and x-axis is time `WHEN` the plot renders `THEN` each non-baseline run shows a line representing the cumulative distance delta at each time point
- [ ] `GIVEN` the time delta is plotted `WHEN` I hover over a delta line `THEN` the tooltip shows the delta value with sign and units (e.g. "+12 s" or "−45 m")
- [ ] `GIVEN` no baseline is selected `WHEN` I view the series plot `THEN` the plot behaves as it does today (no delta lines)
- [ ] The y-axis label updates to reflect the delta metric (e.g. "Time delta (s)" or "Distance delta (m)")
- [ ] Delta computation aligns comparison runs to the baseline using the shared x-axis metric (distance or time) via linear interpolation of stream data

### Implementation notes

- Relevant files: `components/plots/SeriesPlot.tsx` (add delta rendering mode), `lib/analysis/timeDelta.ts` (new pure function: given baseline stream and comparison stream, compute delta series), `app/dashboard/page.tsx` (lift `baselineActivityId` state)
- Interpolation is needed because streams have different sampling rates — use the baseline's x-values as the reference grid and interpolate comparison stream values onto it
- Keep the delta computation in `lib/analysis/` as a pure function so it can be unit-tested
- Distances in metres, times in seconds throughout the data layer; convert only for display
- This story is independently valuable but pairs well with the crosshair (US18) for pinpointing where time was gained/lost on the map
