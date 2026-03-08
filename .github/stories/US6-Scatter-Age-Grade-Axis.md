## Age-grade axis on scatter plot

**As an** athlete  
**I want** to select age-grade percentage as an axis on the scatter plot  
**So that** I can visualise how my age-graded performance varies across activities

### Acceptance criteria

- [x] `GIVEN` the scatter plot is visible `WHEN` I open the Y-axis selector `THEN` "Age Grade (%)" appears as an option
- [x] `GIVEN` I select "Age Grade (%)" as the Y-axis `WHEN` the plot renders `THEN` each point's Y position reflects the WMA age-grade percentage for that activity
- [x] Age-grade for each activity is computed using the athlete's **integer age on the date of the activity** (i.e. `floor(years since date of birth at activity start_date)`), not a single static age
- [x] Age is **not interpolated** between years — `getWAVAFactor` must use `Math.floor(age)` only, with no fractional-age interpolation. This is consistent with commercial race scoring systems (e.g. parkrun, RunScore)
- [x] Activities where age-grade cannot be computed (missing date of birth, sex, or distance/pace data) are excluded from the plot when the age-grade axis is selected
- [x] Age-grade values are computed using the existing `computeAgeGrade` function in `lib/wma/ageGrade.ts`

### Settings: date-of-birth input

- [x] `GIVEN` I open the settings panel `WHEN` I view the options `THEN` there is a **date of birth** field (replacing or supplementing the current static age input)
- [x] `GIVEN` I enter my date of birth `WHEN` I save settings `THEN` the value is persisted as `dateOfBirth` (ISO date string) on the `Athlete` record in Dexie
- [x] The existing `age` field on `Athlete` may be retained for display/backward compatibility but **must not** be used for age-grade computation — only `dateOfBirth` is authoritative

### Implementation notes

- Relevant files:
  - `lib/strava/types.ts` — add `'age_grade'` to `MetricKey`; `Athlete.dateOfBirth` already exists as `string | undefined`
  - `app/dashboard/SettingsPanel.tsx` — replace the age number input with a date-of-birth date picker; derive displayed age from `dateOfBirth` for convenience
  - `components/plots/ScatterPlot.tsx` — add axis option; for each activity compute the athlete's integer age at `activity.start_date` from `athlete.dateOfBirth`, then call `computeAgeGrade`
  - `lib/wma/ageGrade.ts` — remove the fractional-age interpolation branch in `getWAVAFactor` (lines that check `clampedAge !== Math.floor(clampedAge)` and interpolate between adjacent integer ages). The function should always use `Math.floor(age)` and return the factor directly
- Add a pure helper (e.g. `ageAtDate(dateOfBirth: string, eventDate: string): number`) that returns `Math.floor` of the year difference, accounting for whether the birthday has occurred yet in the event year
- Age-grade is a derived metric — compute it at the component level, not in `lib/` data layer
- Requires athlete `dateOfBirth` and `sex` from Dexie — available via `useAthlete()`

## Completed

2026-03-07: Added `age_grade` to `MetricKey`; added `ageAtDate` helper and removed fractional-age interpolation from `getWAVAFactor`; replaced static age input in SettingsPanel with a date-of-birth picker; added Age Grade (%) as a Y-axis option in ScatterPlot with per-activity integer-age computation via `computeAgeGrade`.
