## Move autoscale hint out of scatter plot tooltip

**As an** athlete  
**I want** the "double-click to autoscale" hint to appear in the plot header bar instead of as a tooltip overlay  
**So that** the hint does not obscure data points or interfere with hover interactions

### Acceptance criteria

- [ ] `GIVEN` the scatter plot renders `WHEN` I hover over data points `THEN` no tooltip or overlay text says "double-click to autoscale"
- [ ] `GIVEN` the scatter plot header bar is visible `WHEN` I look at the area near the autoscale button `THEN` a subtle hint (e.g. small muted text) indicates that double-click also resets the zoom
- [ ] `GIVEN` the plot is already at the full data extent (not zoomed) `WHEN` I view the header `THEN` the hint is either hidden or visually de-emphasised since autoscale is not actionable

### Implementation notes

- Relevant files: `components/plots/ScatterPlot.tsx`
- The current "double-click to autoscale" text is rendered as an overlay inside the SVG — remove it and add a small text label in the header `<div>` next to the existing autoscale button
- Keep the double-click handler itself unchanged

## Completed

2026-03-08 — Removed `title` browser tooltip from SVG container; added an inline "or double-click plot" hint next to the Auto-scale button, only visible when the plot is zoomed.
