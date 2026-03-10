# Prioritised backlog

**Goal**: Getting the app usable for race analysis  
**Constraints**: None — all stories are in scope  
**Effort preference**: Quick wins first  

| Priority | Story file | Title | Value | Effort | Rationale |
|----------|------------|-------|-------|--------|-----------|
| ✅ 1 | US8-Roster-Open-In-Strava.md | Open run in Strava from roster | Medium | Low | Quick win; one-file change adds a direct link for deeper race review on Strava |
| ✅ 2 | US9-Roster-Clear-All.md | Clear all roster entries | Medium | Low | Quick win; supports the compare-and-reset workflow central to race analysis |
| ✅ 3 | US7-Scatter-Colour-Dropdown.md | Colour scheme as dropdown | Low | Low | Quick win; declutters scatter plot controls, improving focus on the data |
| ✅ 4 | US5-Filter-Sport-Dropdown.md | Sport filter as dropdown | Low | Low | Quick win; reduces filter panel noise, keeping attention on race-relevant filters |
| ✅ 5 | US14-Auth-Auto-Redirect.md | Skip landing page when authenticated | Low | Low | Quick win; removes friction for returning users during analysis sessions |
| ✅ 6 | US6-Scatter-Age-Grade-Axis.md | Age-grade axis on scatter plot | High | Medium | Directly supports race analysis; builds on existing WMA lib. Now requires a date-of-birth setting and per-activity age calculation (integer age, no interpolation) which adds scope to SettingsPanel and ageGrade.ts |
| ✅ 7 | US11-Series-Raw-With-Moving-Average.md | Raw data with moving average overlay | High | Medium | Core race analysis feature — accurate pacing data with trend line for spotting fade |
| ✅ 8 | US12-Series-Hide-Remove-Runs.md | Hide and remove runs from series plot | High | Medium | Enables focused comparison of specific race efforts without losing the full roster |
| ✅ 9 | US4-Roster-Navigate-To-Map.md | Navigate from roster to map | Medium | Medium | Streamlines race review workflow; wires existing `plotMode` and `selectedActivityId` state |
| ✅ 10 | US1-Filter-Heart-Rate-Filter.md | Heart rate filter | Medium | Medium | Useful for isolating race-intensity efforts; enables US2 (dynamic filters) |
| ✅ 11 | US3-Filter-Improve-Preset-UX.md | Improve filter preset loading UX | Medium | Medium | Speeds up recurring race-analysis workflows (e.g. a "5k Races" preset) |
| ✅ 12 | US15-Settings-Resync-Clear-Data.md | Re-sync and clear data options | Low | Medium | Maintenance utility; not race-specific but important for data integrity |
| ✅ 13 | US21-Scatter-Move-Autoscale-Hint.md | Move autoscale hint out of tooltip | Low | Low | Quick win; one-component change removes tooltip clutter that obscures data during analysis |
| ✅ 14 | US23-Scatter-Larger-Hitbox.md | Larger scatter plot hitbox | Medium | Low | Quick win; directly improves the roster-building workflow central to race comparison |
| ✅ — | US26-Infra-E2E-Fixture-Seeding.md | E2E test infrastructure with fixture seeding | — | Low | Infrastructure; added out-of-band to unblock Playwright verification of all future stories |
| ✅ 15 | US22-Scatter-Improved-Tooltip.md | Improved scatter plot tooltip | High | Medium | Adds age-grade and full description to hover — key race-analysis context without leaving the scatter view |
| ✅ 16 | US19-Series-Defaults-And-Autoscale.md | Series plot defaults and manual autoscale | Medium | Low | Quick win; defaulting to cumulative pace + moving time matches the primary race-analysis use case; removes jarring axis resets |
| ✅ 17 | US16-Filter-Date-Distance-Quick-Presets.md | Quick date and distance range presets | Medium | Low | Quick win; drastically improves filtering 17 years of data down to recent race-relevant runs |
| 18 | US17-Filter-Panel-Layout.md | Reorganise filter panel layout | Medium | Low | Quick win; layout-only change that promotes presets and clarifies panel structure |
| 19 | US25-Series-Time-Delta-Plot.md | Time delta plot | High | High | Core race-analysis feature — directly answers "where did I gain/lose time?"; new pure-function module enables unit testing |
| 20 | US18-Series-Crosshair-Linked-Map.md | Series crosshair with linked map marker | High | High | Links pace data to geography — high value for race review; pairs with US25 for pinpointing time gains/losses on course |
| 21 | US20-Scatter-Axis-Constrained-Zoom.md | Axis-constrained zoom on scatter plot | Medium | Medium | Useful for isolating a pace or distance band; enhances existing brush-to-zoom |
| 22 | US2-Filter-Dynamic-Controls.md | Dynamic filter controls | Medium | High | Depends on US1 (done); significant FilterPanel refactor; more quality-of-life than race analysis |
| 23 | US24-Deployment-Guidance.md | Deployment guidance spike | Medium | Low | Research-only output; no code changes but important for taking the app live |
| 24 | US13-Settings-Unit-Preference.md | Unit preference (km / miles) | Low | High | Touches many display components; does not directly support race analysis |
| 25 | US10-Layout-Tileable-Tabs.md | Tileable and tabbable layout | Medium | High | Valuable for side-by-side comparison but requires a major dashboard refactor; best tackled after core analysis features land. Enables full value of US18 (crosshair + map link) |

## Notes

- **Quick-win cluster (13–18)**: Six low-effort stories that improve scatter, series, and filter UX. Shipping them before the heavier items keeps momentum and removes daily friction.
- **US22 depends on US6**: The improved tooltip shows age-grade, which relies on the date-of-birth setting and `computeAgeGrade` delivered in US6 (done).
- **Series analysis cluster (19–20)**: US25 (time delta) and US18 (crosshair + linked map) are the two highest-value remaining analysis features. US18's linked map marker is most useful once US10 (tileable layout) lands, but the crosshair alone is valuable. US25 is independent.
- **US18 ↔ US10 soft dependency**: The linked map marker in US18 requires series and map visible simultaneously — currently only possible by switching tabs. Full value unlocks after US10, but the series crosshair ships independently.
- **US2 no longer blocked**: US1 (heart rate filter) is done, so US2 can proceed. It remains lower priority because it's a large FilterPanel refactor with a quality-of-life rather than race-analysis payoff.
- **US10 risk**: Tileable layout is still the highest-risk item — it rearchitects the dashboard's single-`plotMode` model. Deferring it near the end ensures it doesn't destabilise features built on the current tab-based layout.
- **Deployment (US24)**: Slotted after analysis features but before the two biggest refactors. It's low effort and timely if the app is approaching a shareable state.
