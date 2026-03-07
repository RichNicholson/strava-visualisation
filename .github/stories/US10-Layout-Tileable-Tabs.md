## Tileable and tabbable layout

**As an** athlete  
**I want** to arrange the dashboard views in a configurable tile/tab layout  
**So that** I can view multiple plots side by side and save my preferred arrangement

### Acceptance criteria

- [ ] `GIVEN` the dashboard loads `WHEN` I view the layout controls `THEN` I can choose between tabbed view (current) and tiled view
- [ ] `GIVEN` I select tiled view `WHEN` the layout changes `THEN` two or more plots render side by side in a grid
- [ ] `GIVEN` I am in tiled view `WHEN` I resize the browser `THEN` the tiles reflow responsively
- [ ] `GIVEN` I configure a layout `WHEN` I reload the page `THEN` my layout preference is restored
- [ ] `GIVEN` I am in tiled view `WHEN` I interact with a plot (e.g. filter, select) `THEN` all visible plots update in sync

### Implementation notes

- Relevant files: `app/dashboard/page.tsx` (currently uses a single `PlotMode` state — needs rearchitecting to support multiple simultaneous views)
- This is a significant refactor — currently only one plot mode is active at a time
- Layout config should be persisted in localStorage (not Dexie, since it is UI preference)
- Consider a simple grid system with Tailwind's grid utilities rather than a complex drag-and-drop library
- Introduce a `LayoutConfig` type for the saved arrangement
