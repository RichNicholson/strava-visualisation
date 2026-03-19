## Per-tile WMA contour toggle and label relocation

**As an** athlete
**I want** to toggle the WMA age grade contour lines on and off independently for each scatter plot tile, with the WMA label visible inside the tile
**So that** I can declutter a tile when contours are not useful without affecting other tiles, and always know at a glance whether contours are active

### Acceptance criteria

- [x] `GIVEN` a scatter plot tile is in age-grade or pace mode `WHEN` WMA contours are available `THEN` a toggle control (e.g. a small button or checkbox) is visible within the tile to show or hide the contour lines
- [x] `GIVEN` the toggle is off `WHEN` the tile renders `THEN` no contour lines are drawn and no WMA-related legend is shown
- [x] `GIVEN` the toggle is on `WHEN` the tile renders `THEN` contour lines are drawn as before
- [x] `GIVEN` multiple scatter plot tiles are displayed `WHEN` I toggle contours on one tile `THEN` the other tiles are unaffected
- [x] `GIVEN` contours are active `WHEN` the tile renders `THEN` the "WMA" label appears inside the tile boundary (not outside or in a separate legend area)
- [x] The toggle state persists across re-renders within the session (e.g. via component state or sessionStorage)

### Implementation notes

- Relevant files: `components/plots/ScatterPlot.tsx` and any parent tile component
- The WMA label currently lives outside the tile — move it to an overlay inside the SVG or the tile header
- The toggle can be a small icon button in the tile's control area (similar to existing zoom controls if present)
- Only show the toggle on tiles where WMA contours are applicable (i.e. where the y-axis is pace or age grade)

## Completed

**2026-03-19**

- Added `showWMAContours` local state (default `true`) to `ScatterPlot` — each instance is independent, so per-tile isolation is automatic.
- Added a "WMA" toggle button in the tile's control row, rendered only when contours are applicable (x=distance, y=average_pace, athlete age+sex set). Active state uses green styling matching existing patterns; inactive uses muted grey.
- Moved the "WMA" label from the external control row into the SVG plot area as a `<text>` element in the top-right corner of the inner plot. It is only rendered when contours are active.
- Gated the entire contour rendering block on `showWMAContours` — when false, no contour paths or grade labels are drawn.
- Removed the top-bar "WMA contours" button from `page.tsx` (and the associated `showWMA` state) since the toggle now lives inside each ScatterPlot tile.
- The `showWMA` prop on `ScatterPlot` is retained (defaults to `true`) for future use if callers need to suppress the feature entirely.
