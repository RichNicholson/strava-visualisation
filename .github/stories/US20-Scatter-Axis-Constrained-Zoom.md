## Axis-constrained zoom on scatter plot

**As an** athlete  
**I want** to zoom in on just the x-axis or just the y-axis by dragging horizontally or vertically  
**So that** I can focus on a specific distance range or pace range without losing context on the other axis

### Acceptance criteria

- [ ] `GIVEN` the scatter plot is displayed `WHEN` I click-and-drag primarily in the horizontal direction (x movement > 2× y movement) `THEN` only the x-axis zooms to the selected range; the y-axis remains unchanged
- [ ] `GIVEN` the scatter plot is displayed `WHEN` I click-and-drag primarily in the vertical direction (y movement > 2× x movement) `THEN` only the y-axis zooms to the selected range; the x-axis remains unchanged
- [ ] `GIVEN` the scatter plot is displayed `WHEN` I click-and-drag diagonally (neither axis dominant) `THEN` both axes zoom to the selected rectangular region (existing behaviour)
- [ ] `GIVEN` the plot is zoomed on a single axis `WHEN` I click the autoscale button or double-click `THEN` both axes reset to the full data extent
- [ ] `GIVEN` the zoom box is being drawn `WHEN` it is constrained to one axis `THEN` a visual cue indicates the constraint (e.g. the selection rectangle stretches full height or full width)

### Implementation notes

- Relevant files: `components/plots/ScatterPlot.tsx`
- Currently brush-to-zoom is only enabled when X=distance, Y=pace. Consider enabling it for all axis combinations — or at least for the axis-constrained mode
- Detect dominant drag axis in the `brush.on('end')` handler by comparing selection width vs height relative to the plot dimensions
- For x-only zoom: keep `viewDomain.y` unchanged, update `viewDomain.x`. For y-only zoom: vice versa
- The 2× threshold is a suggestion — tune for feel; the key UX requirement is that a clearly horizontal or vertical drag constrains to one axis
