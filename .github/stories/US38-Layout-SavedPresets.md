## Named layout presets

**As an** athlete
**I want** to save and reload named layout presets
**So that** I can quickly switch between purpose-built workspace configurations (e.g. "Marathon analysis", "Training overview") without manually rebuilding the tile and channel setup each time

### Acceptance criteria

- [x] `GIVEN` I have configured a workspace (tabs, tile types, channel settings) `WHEN` I save it with a name `THEN` the layout is saved persistently and survives a page reload
- [x] `GIVEN` one or more saved layouts exist `WHEN` I open the layout picker `THEN` I see a list of saved layouts with load and delete actions
- [x] `GIVEN` I load a saved layout `WHEN` the page re-renders `THEN` the workspace (tabs, tile types, channel configurations) matches what was saved — the active filter and selected runs are unchanged
- [x] `GIVEN` I delete a saved layout `WHEN` I confirm `THEN` it no longer appears in the list
- [x] `GIVEN` a layout already exists with the same name `WHEN` I save with that name `THEN` the existing layout is overwritten (update behaviour, consistent with filter presets)

### Implementation notes

- Persist to Dexie: add a new table `savedLayouts` with schema `{ id: string, name: string, workspace: WorkspaceState }`
- Add a `useSavedLayouts` hook (analogous to `useFilterPresets` in `hooks/useFilterPresets.ts`) wrapping the Dexie CRUD
- Loading replaces the full `WorkspaceState` in `app/dashboard/page.tsx` but must not touch `FilterState` or the active roster
- UI: a save/load dropdown near the tab bar — reuse the visual pattern from `components/filter/FilterPresets.tsx` (details/summary dropdown + name input + save button)
- `WorkspaceState` is defined in `lib/strava/types.ts`; no type changes needed

## Completed

2026-03-19 — Added named layout presets with Dexie persistence, useSavedLayouts hook, and LayoutPresets UI component

- Added `savedLayouts` table to Dexie schema (lib/db/schema.ts)
- Created `hooks/useSavedLayouts.ts` with save, load, delete operations
- Created `components/ui/LayoutPresets.tsx` with details/summary dropdown UI
- Integrated LayoutPresets into app/dashboard/page.tsx near the tab bar
- Loading replaces WorkspaceState without touching FilterState or roster
- Saving with an existing name overwrites the existing layout
