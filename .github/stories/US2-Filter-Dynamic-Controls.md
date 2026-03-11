## Dynamic filter controls

**As an** athlete  
**I want** filter controls to be dynamic — with date, distance, and pace always visible, and others addable on demand  
**So that** the filter panel is not cluttered with controls I rarely use

### Acceptance criteria

- [ ] `GIVEN` the dashboard loads `WHEN` I view the filter panel `THEN` date, distance, and pace filters are always visible
- [ ] `GIVEN` the dashboard loads `WHEN` I view the filter panel `THEN` optional filters (heart rate, elevation, suffer score, etc.) are hidden by default
- [ ] `GIVEN` optional filters are hidden `WHEN` I click an "Add filter" button `THEN` a menu/popover lists available optional filters
- [ ] `GIVEN` I select "Heart rate" from the add-filter menu `WHEN` the menu closes `THEN` a heart rate range slider appears in the filter panel
- [ ] `GIVEN` an optional filter is visible `WHEN` I click a remove/close icon on it `THEN` the filter is removed from the panel and its value is cleared from the active filter state

### Implementation notes

- Relevant files: `components/filter/FilterPanel.tsx` (reorganise into always-on vs optional sections), `lib/strava/types.ts` (extend `FilterState` if new optional filters need fields)
- This story depends on US1 (heart rate filter) if heart rate is one of the addable filters
- Keep `applyFilter` pure — optional filter fields should default to `null` meaning "not active"

## Completed

2026-03-11 — Added optional filter tracking (`activeOptionals` state) to `FilterPanel`; date/distance/pace are always visible; heart rate is hidden by default and can be added via an "Add filter" details-based popover and removed via a × button that clears its value from filter state. Verified by 5 Playwright AC tests.
