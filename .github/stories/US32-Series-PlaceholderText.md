## Consistent placeholder text in series plot

**Bug**: The placeholder message shown in the series plot when no runs are rostered is rendered in inconsistent font sizes, which looks jarring.

### Acceptance criteria

- [x] `GIVEN` no runs are in the roster `WHEN` the series plot is displayed `THEN` the placeholder text is rendered at a single, consistent font size throughout
- [x] `GIVEN` the placeholder is visible `WHEN` I resize the panel `THEN` the text remains consistently sized (no mixed sizing between lines or elements)

## Completed

2026-03-19 — Added `bg-white z-10` to both placeholder overlays so old SVG content no longer shows through; updated empty-roster message to be more accurate.

- `components/plots/SeriesPlot.tsx`: added `bg-white z-10` to the "stream not loaded" and "no activities" overlay divs; changed "No activities match the current filters" to "Add runs to the roster to compare them here"

### Implementation notes

- Relevant file: `components/plots/SeriesPlot.tsx` — find the placeholder/empty-state render path and ensure all text elements share the same font size and style
