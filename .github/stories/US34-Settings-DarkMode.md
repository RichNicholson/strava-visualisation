## Dark mode toggle

**As an** athlete
**I want** to switch the app to a dark colour scheme
**So that** I can use it comfortably in low-light environments without eye strain

### Acceptance criteria

- [ ] `GIVEN` I open Settings `WHEN` I find the appearance section `THEN` there is a dark mode toggle (light / dark)
- [ ] `GIVEN` I enable dark mode `WHEN` any page in the app renders `THEN` the background, text, panels, and controls all use a dark colour scheme
- [ ] `GIVEN` dark mode is enabled `WHEN` I reload the page `THEN` dark mode is still active (preference is persisted)
- [ ] `GIVEN` I disable dark mode `WHEN` the app renders `THEN` it reverts to the light colour scheme
- [ ] `GIVEN` dark mode is active `WHEN` plots render (scatter, series, map) `THEN` axes, labels, and gridlines are legible against the dark background; the TABLEAU10 palette remains in use

### Implementation notes

- Use Tailwind CSS v4's `dark:` variant throughout; enable dark mode via a class on `<html>` (Tailwind `class` strategy) rather than `media` strategy so it can be toggled manually
- Persist the preference in Dexie (athlete settings) or `localStorage`; reading it early (before first paint) avoids flash of wrong theme
- A quick-toggle button on the main dashboard header (e.g. a sun/moon icon) would be a useful addition alongside the Settings toggle — scope this as optional within the story
- D3 SVG elements (scatter plot, series plot) use inline styles and colours from TABLEAU10 — these will need explicit dark-mode overrides for axes, gridlines, and backgrounds
- The map tile layer (Leaflet) may need a CSS filter (`invert + hue-rotate`) for a dark appearance; this is a known pattern
- This story touches many files — estimate effort accordingly; consider whether a single CSS variable layer (e.g. a design token file) would reduce the surface area
