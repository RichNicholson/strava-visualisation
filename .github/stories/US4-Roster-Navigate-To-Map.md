## Navigate from roster to map

**As an** athlete  
**I want** to easily navigate from a rostered run to the map view  
**So that** I can see the route of a run I'm comparing without manually switching tabs

### Acceptance criteria

- [ ] `GIVEN` runs are in the roster `WHEN` I click a "Show on map" icon/button on a roster entry `THEN` the view switches to the map tab with that run's route displayed
- [ ] `GIVEN` I navigate to the map from the roster `WHEN` the map loads `THEN` it is centred and zoomed to fit the selected run's route
- [ ] The roster run's colour (from `colorMap`) is preserved on the map view

### Implementation notes

- Relevant files: `components/roster/RosterPanel.tsx` (add map-navigation action), `app/dashboard/page.tsx` (wire up `plotMode` switch + `selectedActivityId`), `components/plots/RouteMap.tsx`
- The dashboard already tracks `selectedActivityId` and `plotMode` state — this story connects them via the roster
