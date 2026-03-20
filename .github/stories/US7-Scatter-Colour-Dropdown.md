## Colour scheme as dropdown

**As an** athlete  
**I want** the scatter plot colour scheme selector to be a compact dropdown instead of buttons  
**So that** it takes less space and the colour scheme names are less prominent

### Acceptance criteria

- [ ] `GIVEN` the scatter plot is visible `WHEN` I view the axis controls `THEN` the colour scheme is shown as a dropdown, not as a row of buttons
- [ ] `GIVEN` I select a new colour scheme from the dropdown `WHEN` the selection changes `THEN` the plot updates to use the new colour scheme immediately
- [ ] The dropdown label shows the currently selected scheme name

### Implementation notes

- Relevant files: `components/plots/ScatterPlot.tsx` (replace colour scheme buttons with `<select>` or custom dropdown), `components/plots/AxisSelector.tsx` (if this is refactored out)
- The `COLOR_SCHEMES` record already maps names to interpolators — just change the UI control

## Completed

**2026-03-07** — Replaced colour scheme button row with a `<select>` dropdown in `ScatterPlot.tsx`. Displays current scheme name; updates plot on change.
