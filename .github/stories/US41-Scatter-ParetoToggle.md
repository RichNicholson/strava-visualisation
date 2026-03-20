## Pareto front toggle on scatter plot

**As an** athlete
**I want** to toggle the Pareto front highlight on and off
**So that** I can reduce visual noise when I don't need to see the optimal frontier

### Acceptance criteria

- [x] `GIVEN` the scatter plot is displayed `WHEN` I click the Pareto toggle button `THEN` the Pareto front indicators (rings around dots) are hidden
- [x] `GIVEN` the Pareto front is hidden `WHEN` I click the toggle again `THEN` the rings reappear
- [x] `GIVEN` the Pareto toggle button is shown `WHEN` I view it `THEN` its visual state clearly indicates whether the Pareto front is currently on or off (consistent with the WMA toggle button style)

### Implementation notes

- Add a `showPareto` boolean to `ScatterPlot` local state, defaulting to `true`
- Add a toggle button in the scatter plot controls alongside the existing WMA button, using the same button style
- Conditionally skip rendering the Pareto ring overlay when `showPareto` is `false`
- State is local to the component; no persistence needed

## Completed

2026-03-19 — Added Pareto front toggle button to scatter plot controls

- Added showPareto boolean state (default true) to ScatterPlot
- Added toggle button in Row 1 of controls using WMA-style green/gray styling
- Pareto ring rendering conditionally skipped when showPareto is false
- Added showPareto to useEffect dependency array
