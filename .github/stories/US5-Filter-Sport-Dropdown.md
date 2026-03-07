## Sport filter as dropdown

**As an** athlete  
**I want** the sport type filter to be a compact multi-select dropdown instead of a row of buttons  
**So that** the filter panel does not waste space listing all sport types on screen

### Acceptance criteria

- [ ] `GIVEN` the dashboard loads `WHEN` I view the filter panel `THEN` sport types are shown in a multi-select dropdown, not as individual buttons
- [ ] `GIVEN` the dropdown is closed `WHEN` I look at the filter panel `THEN` the currently selected sports are summarised as a label (e.g. "Run, Ride" or "2 selected")
- [ ] `GIVEN` I open the dropdown `WHEN` I toggle sport selections `THEN` the filtered activities update in real time without closing the dropdown
- [ ] `GIVEN` many sport types exist `WHEN` I open the dropdown `THEN` all sport types are listed and scrollable

### Implementation notes

- Relevant files: `components/filter/FilterPanel.tsx` (replace sport toggle buttons with a dropdown component)
- Sports list is derived from `getSportTypes()` in `lib/analysis/filter.ts` — no changes needed there
- No external component library — build a simple `<details>`/`<summary>` or custom dropdown using Tailwind
