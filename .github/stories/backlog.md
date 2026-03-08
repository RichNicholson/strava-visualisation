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
| 9 | US4-Roster-Navigate-To-Map.md | Navigate from roster to map | Medium | Medium | Streamlines race review workflow; wires existing `plotMode` and `selectedActivityId` state |
| 10 | US1-Filter-Heart-Rate-Filter.md | Heart rate filter | Medium | Medium | Useful for isolating race-intensity efforts; enables US2 (dynamic filters) |
| 11 | US3-Filter-Improve-Preset-UX.md | Improve filter preset loading UX | Medium | Medium | Speeds up recurring race-analysis workflows (e.g. a "5k Races" preset) |
| 12 | US15-Settings-Resync-Clear-Data.md | Re-sync and clear data options | Low | Medium | Maintenance utility; not race-specific but important for data integrity |
| 13 | US2-Filter-Dynamic-Controls.md | Dynamic filter controls | Medium | High | Depends on US1; significant FilterPanel refactor; more quality-of-life than race analysis |
| 14 | US13-Settings-Unit-Preference.md | Unit preference (km / miles) | Low | High | Touches many display components; does not directly support race analysis |
| 15 | US10-Layout-Tileable-Tabs.md | Tileable and tabbable layout | Medium | High | Valuable for side-by-side comparison but requires a major dashboard refactor; best tackled after core analysis features land |

## Notes

- **US1 → US2 dependency**: US2 (dynamic filter controls) assumes heart rate is one of the addable filters, so US1 should land first. They are kept adjacent in the lower half of the backlog since neither is on the critical path for race analysis.
- **Quick-win cluster (1–5)**: All five are Low-effort, single- or two-file changes. Shipping them as a batch would noticeably polish the UI before the heavier race-analysis work begins.
- **Series plot cluster (7–8)**: US11 (moving average) and US12 (hide/remove runs) are tightly coupled — both modify `SeriesPlot.tsx` and the roster interaction model. Implementing them back-to-back avoids rework.
- **US10 risk**: The tileable layout is the highest-risk item — it rearchitects the dashboard's single-`plotMode` model. Deferring it to last ensures it doesn't destabilise features built on the current tab-based layout.
- **Age-grade (US6)** is the highest-value single story for the race analysis goal. It now includes a date-of-birth setting change and per-activity integer-age calculation (no fractional interpolation), which adds SettingsPanel and `ageGrade.ts` scope. Still medium effort but toward the upper end. If the team can only pick one medium-effort item to fast-follow the quick wins, this is the one.
