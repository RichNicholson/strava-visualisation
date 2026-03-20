## Hide and remove runs from series plot

**As an** athlete  
**I want** to temporarily hide or permanently remove runs from the series plot  
**So that** I can focus on specific runs without losing my full roster

### Acceptance criteria

- [x] `GIVEN` runs are in the roster and the series plot is active `WHEN` I click a "hide" toggle on a roster entry `THEN` that run's line disappears from the series plot but remains in the roster
- [x] `GIVEN` a run is hidden `WHEN` I click the "hide" toggle again `THEN` the run's line reappears on the series plot
- [x] `GIVEN` runs are in the roster and the series plot is active `WHEN` I click a "remove" button on a roster entry `THEN` the run is removed from the roster entirely
- [x] Hidden state is per-session only — it does not persist across page reloads

### Implementation notes

- Relevant files: `components/roster/RosterPanel.tsx` (add hide toggle), `app/dashboard/page.tsx` (add `hiddenRoster` state as a `Set<number>`), `components/plots/SeriesPlot.tsx` (filter out hidden IDs from the rendered streams)
- The "remove" action already exists via `onRemove` — this story adds a complementary "hide" action

## Completed

2026-03-08: Added `hiddenRoster` state to dashboard; eye-toggle button in `RosterPanel` adds/removes IDs from the set; `SeriesPlot` receives pre-filtered activities excluding hidden IDs; hidden state resets on page reload (session-only).
