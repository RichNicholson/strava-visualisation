## Age-grade axis on scatter plot

**As an** athlete  
**I want** to select age-grade percentage as an axis on the scatter plot  
**So that** I can visualise how my age-graded performance varies across activities

### Acceptance criteria

- [ ] `GIVEN` the scatter plot is visible `WHEN` I open the Y-axis selector `THEN` "Age Grade (%)" appears as an option
- [ ] `GIVEN` I select "Age Grade (%)" as the Y-axis `WHEN` the plot renders `THEN` each point's Y position reflects the WMA age-grade percentage for that activity
- [ ] Activities where age-grade cannot be computed (missing age, sex, or distance/pace data) are excluded from the plot when age-grade axis is selected
- [ ] Age-grade values are computed using the existing `computeAgeGrade` function in `lib/wma/ageGrade.ts`

### Implementation notes

- Relevant files: `lib/strava/types.ts` (add `'age_grade'` to `MetricKey`), `components/plots/ScatterPlot.tsx` (add axis option, compute values), `lib/wma/ageGrade.ts` (already has `computeAgeGrade`)
- Age-grade is a derived metric — compute it at the component level, not in `lib/` data layer
- Requires athlete age and sex from Dexie — already available via `useAthlete()`
