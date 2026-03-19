## Replace WMA checkboxes with toggle buttons in series plot

**As an** athlete
**I want** the WMA/smoothing controls in the series plot to use toggle buttons instead of checkboxes
**So that** the UI is consistent with the scatter plot and more visually compact

### Acceptance criteria

- [x] `GIVEN` the series plot is displayed `WHEN` I view the WMA or smoothing controls `THEN` they appear as toggle buttons rather than checkboxes
- [x] `GIVEN` an option is active `WHEN` I view its button `THEN` the button appears in the active/highlighted state (consistent with the WMA toggle style in the scatter plot)
- [x] `GIVEN` an option is inactive `WHEN` I view its button `THEN` the button appears in the inactive/outlined state
- [x] `GIVEN` I click a toggle button `WHEN` the state changes `THEN` the series plot updates as before (functional parity with the checkbox behaviour)

### Implementation notes

- Locate the WMA or moving-average checkbox controls in `components/plots/SeriesPlot.tsx`
- Replace `<input type="checkbox">` elements with `<button>` toggle elements using the same style as the WMA toggle in `components/plots/ScatterPlot.tsx`
- Functionality must be identical; only the visual control changes

## Completed

2026-03-19 — Replaced WMA checkbox controls with toggle buttons in series plot

- Replaced both <input type="checkbox"> WMA controls with <button> toggle elements
- Both multi-channel and single-metric mode controls updated
- Uses same green/gray toggle style as ScatterPlot WMA button
- Functional parity maintained
