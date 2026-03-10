## Improved scatter plot tooltip

**As an** athlete  
**I want** the scatter plot tooltip to show the full activity description, my age at the time, and age-grade percentage  
**So that** I can identify a run and see its race-analysis context without leaving the scatter view

### Acceptance criteria

- [ ] `GIVEN` I hover over a data point `WHEN` the tooltip appears `THEN` it includes the activity name (full, not truncated)
- [ ] `GIVEN` I hover over a data point `WHEN` the tooltip appears `THEN` it includes the activity date formatted as a readable date (e.g. "8 Mar 2026")
- [ ] `GIVEN` I hover over a data point `WHEN` the tooltip appears `THEN` it shows the distance in km and average pace in min/km
- [ ] `GIVEN` date of birth is set in settings `WHEN` I hover over a data point `THEN` the tooltip shows the athlete's integer age at the time of the activity (e.g. "Age: 42")
- [ ] `GIVEN` date of birth is set and the activity is a recognised WMA distance `WHEN` I hover over a data point `THEN` the tooltip shows the age-grade percentage (e.g. "Age grade: 62.3%")
- [ ] `GIVEN` date of birth is **not** set `WHEN` I hover over a data point `THEN` age and age-grade lines are omitted (not shown as "N/A")

### Implementation notes

- Relevant files: `components/plots/ScatterPlot.tsx` (expand tooltip rendering), `lib/wma/ageGrade.ts` (reuse `computeAgeGrade` for the tooltip value)
- The athlete's date of birth is available from the `Athlete` record (stored in Dexie, passed as a prop)
- Integer age at activity time: `activityYear - birthYear` (consistent with US6 implementation — no fractional interpolation)
- Display-layer conversions only: distance → km, pace → min:ss/km

## Completed

2026-03-08: Expanded the scatter tooltip in `ScatterPlot.tsx` to show the full activity name (no truncation), date formatted as "D Mon YYYY", distance, pace, and — when date of birth and sex are set — the athlete's integer age and age-grade percentage at the time of the activity. Age and age-grade are omitted entirely when date of birth is not set. Verified with Playwright E2E test (`e2e/tooltip.spec.ts`).
