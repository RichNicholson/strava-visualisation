## Unit preference in settings

**As an** athlete  
**I want** to choose between kilometres and miles in the settings  
**So that** distances and paces are displayed in my preferred unit system

### Acceptance criteria

- [ ] `GIVEN` I open the settings panel `WHEN` I view the options `THEN` there is a unit toggle for km vs miles
- [ ] `GIVEN` I select miles `WHEN` I view the activity table, scatter plot, and series plot `THEN` distances show in miles and paces show in min/mile
- [ ] `GIVEN` I select km (default) `WHEN` I view any display `THEN` distances show in km and paces show in min/km
- [ ] The unit preference is persisted in the athlete record in Dexie and restored on page reload
- [ ] All data in `lib/` remains in SI units (metres, m/s, s/km) — conversion happens only in display components

### Implementation notes

- Relevant files: `lib/strava/types.ts` (add optional `units?: 'metric' | 'imperial'` to `Athlete`), `app/dashboard/SettingsPanel.tsx` (add toggle), `components/` (update display formatting in table, plots)
- Do NOT change any logic in `lib/analysis/` or `lib/wma/` — conversion is purely a display concern
- Consider a shared `formatDistance(metres, unit)` and `formatPace(sPerkm, unit)` utility in a new `lib/format.ts` or in components
