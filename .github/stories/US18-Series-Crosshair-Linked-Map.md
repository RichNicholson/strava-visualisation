## Series crosshair with linked map marker

**As an** athlete  
**I want** a crosshair marker on the series plot that tracks my mouse position, linked to a dot on the route map  
**So that** I can see exactly where on the course a particular pace or heart rate value occurred

### Acceptance criteria

- [ ] `GIVEN` the series plot is visible with at least one run `WHEN` I hover over a line `THEN` a vertical crosshair line appears at the cursor's x-position and a dot is drawn on the hovered line at the corresponding data point
- [ ] `GIVEN` I am hovering on the series plot `WHEN` the crosshair is visible `THEN` a small label near the dot shows the y-value (formatted with appropriate units) and the x-value
- [ ] `GIVEN` the series plot and route map are visible side-by-side (tileable layout or future linked view) `WHEN` the crosshair dot is active on the series plot `THEN` a corresponding marker appears on the route map at the matching lat/lng position
- [ ] `GIVEN` I move the mouse away from the series plot `WHEN` the cursor leaves the plot area `THEN` both the crosshair and the map marker are removed
- [ ] The crosshair position is communicated via a shared state or callback (e.g. `hoveredStreamIndex`) — not by direct DOM coupling between SeriesPlot and RouteMap

### Implementation notes

- Relevant files: `components/plots/SeriesPlot.tsx` (add crosshair overlay group, vertical line + circle marker), `components/plots/RouteMap.tsx` (render a marker at `latlng[index]` when `hoveredStreamIndex` is set), `app/dashboard/page.tsx` (lift `hoveredStreamIndex` state and pass to both components)
- Use the distance stream to map crosshair x-position → stream array index → `latlng[index]`
- The linked map marker is most useful once the tileable layout (US10) lands, but the crosshair on the series plot is independently valuable and should ship first
- Keep the crosshair rendering in the existing D3 `useEffect` — append an overlay `<g>` that updates on `mousemove`
