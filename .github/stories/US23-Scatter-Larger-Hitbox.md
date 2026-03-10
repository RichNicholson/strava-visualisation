## Larger scatter plot hitbox for dot interaction

**As an** athlete  
**I want** scatter plot dots to have a larger clickable area  
**So that** I can easily click on data points to add them to the roster or right-click to open in Strava, even though the visual dots are small

### Acceptance criteria

- [ ] `GIVEN` the scatter plot renders `WHEN` I move my mouse near (but not exactly over) a visible dot `THEN` the tooltip activates and the cursor indicates the point is interactive, at a distance of at least ~8 px from the dot centre
- [ ] `GIVEN` a dot is rendered at 5 px radius `WHEN` I click within 12 px of its centre `THEN` the roster toggle fires (same as clicking the dot directly)
- [ ] `GIVEN` dots are close together `WHEN` I hover between two dots `THEN` the nearest dot is highlighted (not both)
- [ ] The visual dot size remains unchanged (5 px radius default, 8 px rostered) — only the invisible hit area increases

### Implementation notes

- Relevant files: `components/plots/ScatterPlot.tsx`
- Approach: render a transparent `<circle>` with a larger radius (e.g. 12 px) behind each visible dot, attach the mouse event handlers to the larger circle instead of the visible one
- Alternatively, use `pointer-events` with a larger stroke-width on the visible circles, or use Voronoi tessellation for nearest-point detection
- Ensure right-click (context menu → open in Strava) also works on the larger hit area

## Completed

2026-03-08 — Split in-bounds dot rendering into visual circles (r=5/8, pointer-events off) and transparent hit-area circles (r=12) layered on top; all event handlers moved to the hit layer. Visual dot size unchanged.
