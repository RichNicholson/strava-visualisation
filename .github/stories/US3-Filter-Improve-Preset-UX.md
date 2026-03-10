## Improve filter preset loading UX

**As an** athlete  
**I want** a clearer way to save and load filter presets  
**So that** I can quickly switch between my frequently used filter configurations

### Acceptance criteria

- [ ] `GIVEN` filter presets exist `WHEN` I view the filter panel `THEN` there is a clearly labelled dropdown or button group showing saved presets
- [ ] `GIVEN` I select a saved preset `WHEN` the preset loads `THEN` all filter controls update to reflect the preset values immediately
- [ ] `GIVEN` no presets exist `WHEN` I view the filter panel `THEN` the preset area shows a helpful prompt (e.g. "Save your current filter as a preset")
- [ ] `GIVEN` I save a preset with the name "5k Races" `WHEN` I reload the page and open the filter panel `THEN` "5k Races" appears in the preset list

### Implementation notes

- Relevant files: `components/filter/FilterPresets.tsx`, `hooks/useFilterPresets.ts`
- Presets are stored in localStorage via `useFilterPresets` — no Dexie changes needed
- Focus is on UX clarity, not new functionality — the save/load mechanism already works

## Completed

2026-03-08 — Replaced the flat preset list with a `<details>` dropdown (matching the sport-filter pattern); clicking a preset name loads it immediately; empty state shows a helpful prompt.
