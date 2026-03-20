## Quick date and distance range presets

**As an** athlete  
**I want** shortcut buttons for common date ranges (last 6 months, 1 year, 2 years) and a sensible distance cap  
**So that** I can quickly narrow down to recent or race-relevant activities without wrestling with fine-grained sliders across 17 years of data

### Acceptance criteria

- [ ] `GIVEN` activities span many years `WHEN` I view the date range section of the filter panel `THEN` I see quick-select buttons for "6 months", "1 year", "2 years", and "All"
- [ ] `GIVEN` I click the "1 year" quick-select button `WHEN` the filter updates `THEN` the date range slider and filter state reflect a from-date of exactly one year ago to today
- [ ] `GIVEN` I click "All" `WHEN` the filter updates `THEN` the date range resets to the full extent of my data (equivalent to clearing the date filter)
- [ ] `GIVEN` activities include distances up to ultra-marathon length `WHEN` I view the distance section `THEN` I see a "≤ Marathon" quick-select button that caps the upper distance at 42 195 m
- [ ] `GIVEN` a quick-select is active `WHEN` I manually adjust the slider `THEN` the quick-select visually deselects (no button appears pressed)

### Implementation notes

- Relevant files: `components/filter/FilterPanel.tsx` (add button row above each `RangeSlider`), possibly a small `QuickSelect` presentational component
- Date calculation should use `Date` relative to today; distances are in metres throughout the data layer
- The "≤ Marathon" button should set `distanceRange.max` to `42195` (metres) and `min` to `0`
- Keep `applyFilter` unchanged — these buttons only set `FilterState` values that the existing logic already handles
