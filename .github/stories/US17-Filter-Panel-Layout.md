## Reorganise filter panel layout

**As an** athlete  
**I want** the filter panel to clearly separate Sport selection, filter controls, and presets — with presets promoted to the top  
**So that** I can find and apply saved presets quickly without scrolling past individual filter sliders

### Acceptance criteria

- [ ] `GIVEN` the dashboard loads `WHEN` I view the filter panel `THEN` the sections appear in this order: Presets, Sport, Date range, Distance, Pace, Heart Rate
- [ ] `GIVEN` the filter panel renders `WHEN` I look at the section headings `THEN` each section (Presets, Sport, Filters) has a clear visual separator (e.g. divider line or distinct heading style)
- [ ] `GIVEN` I save a preset `WHEN` I load it from the Presets section at the top `THEN` both the sport selection and all filter sliders update to match the preset values
- [ ] `GIVEN` the filter panel is rendered on a narrow viewport (≤ 400 px sidebar) `WHEN` I scroll `THEN` no content is clipped or overlapping

### Implementation notes

- Relevant files: `components/filter/FilterPanel.tsx` (reorder JSX sections), `components/filter/FilterPresets.tsx`
- Presets already include sport in the saved `FilterState`, so loading a preset will set sport automatically — no extra wiring needed
- Consider grouping Date/Distance/Pace/HR under a "Filters" sub-heading with a top divider to visually separate from Presets and Sport
- No logic changes — this is a layout-only refactor

## Completed

**2026-03-10** — Reordered `FilterPanel.tsx` JSX into three visually separated sections (Presets → Sport → Filters), with `<hr>` dividers between each group and a "Filters" sub-heading grouping Date/Distance/Pace/HR.
