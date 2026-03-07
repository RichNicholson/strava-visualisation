## Hide and remove runs from series plot

**As an** athlete  
**I want** to temporarily hide or permanently remove runs from the series plot  
**So that** I can focus on specific runs without losing my full roster

### Acceptance criteria

- [ ] `GIVEN` runs are in the roster and the series plot is active `WHEN` I click a "hide" toggle on a roster entry `THEN` that run's line disappears from the series plot but remains in the roster
- [ ] `GIVEN` a run is hidden `WHEN` I click the "hide" toggle again `THEN` the run's line reappears on the series plot
- [ ] `GIVEN` runs are in the roster and the series plot is active `WHEN` I click a "remove" button on a roster entry `THEN` the run is removed from the roster entirely
- [ ] Hidden state is per-session only — it does not persist across page reloads

### Implementation notes

- Relevant files: `components/roster/RosterPanel.tsx` (add hide toggle), `app/dashboard/page.tsx` (add `hiddenRoster` state as a `Set<number>`), `components/plots/SeriesPlot.tsx` (filter out hidden IDs from the rendered streams)
- The "remove" action already exists via `onRemove` — this story adds a complementary "hide" action
