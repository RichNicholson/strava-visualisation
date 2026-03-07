## Heart rate filter

**As an** athlete  
**I want** to filter activities by heart rate range  
**So that** I can focus on efforts at a particular intensity

### Acceptance criteria

- [ ] `GIVEN` activities are synced `WHEN` I open the filter panel `THEN` a heart rate range slider is visible (if heart rate data exists on any activity)
- [ ] `GIVEN` the heart rate slider is set to 140–165 bpm `WHEN` I view the activity table `THEN` only activities with `average_heartrate` between 140 and 165 are shown
- [ ] Activities without heart rate data (`average_heartrate` is undefined) are excluded when the heart rate filter is active
- [ ] The heart rate slider min/max are derived from the actual data range of synced activities

### Implementation notes

- Relevant files: `lib/strava/types.ts` (add `heartrate` to `FilterState.pace` or as a new top-level field), `lib/analysis/filter.ts` (`applyFilter`), `components/filter/FilterPanel.tsx` (new `RangeSlider` instance)
- Add a new test case in `lib/analysis/filter.test.ts` covering the heart rate predicate
- `average_heartrate` is optional on `StravaActivity` — handle missing values explicitly
