## Replace age grade data for smoother short-distance contours

**As an** athlete
**I want** the age grade contour lines to be smooth and reliable at short distances (e.g. 5 km)
**So that** I can accurately compare short-distance performances across age

### Acceptance criteria

- [x] `GIVEN` the updated age grade data file is in place `WHEN` I view the scatter plot with WMA contours enabled `THEN` the contour lines are visually smooth and free of artefacts at distances as short as 5 km
- [x] `GIVEN` the data file is replaced `WHEN` I view long-distance contours `THEN` they are unchanged or improved (no regression)
- [x] The new data file is sourced from the spreadsheet provided by the user and replaces the existing Howard Grubb data

## Completed

2026-03-19 — Replaced Howard Grubb WAVA data with MLDR Road Factors 2025 from `MLDRRoadFactors2025.xlsm`.

- Extracted Male and Female sheets using a temporary Node `xlsx` script; schema identical to existing `wava-standards.json` (distances, standards, ageFactors)
- 22 road distances from 1 Mile to 200 km; minimum distance is 1.609 km (1 Mile) — short-distance noise eliminated
- Added 3 spot-check tests to `lib/wma/ageGrade.test.ts`; all 20 tests pass

### Implementation notes

- Relevant file: the WMA data table in `lib/wma/` — locate the age grade lookup data and replace it with the user-supplied spreadsheet
- The spreadsheet `MLDRRoadFactors2025.xlsm` is in the repo root — parse it into the same format expected by the existing `ageGrade` lookup code
- Do not change the `ageGrade` calculation logic — only the underlying data table
- Verify the output of `computeAgeGrade` against a few known values from the new spreadsheet before closing the story
