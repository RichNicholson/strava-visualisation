## Tab bar UX improvements

**As an** athlete
**I want** a cleaner tab bar experience
**So that** creating, renaming, and deleting tabs is intuitive and consistent with the rest of the UI

### Acceptance criteria

- [x] `GIVEN` a tab exists `WHEN` I hover over the tab `THEN` a delete (×) icon appears; clicking it removes the tab — the permanent orange delete button is gone
- [x] `GIVEN` a tab exists `WHEN` I double-click the tab name `THEN` the name becomes editable inline; pressing Enter or blurring commits the rename
- [x] `GIVEN` I add a new tab `WHEN` tabs already exist `THEN` the new tab is named "Tab N" where N is the highest existing tab number + 1 (e.g. if Tab 1 and Tab 3 exist, the new tab is "Tab 4")
- [x] `GIVEN` the workspace is in single-tile mode `WHEN` I view the dashboard `THEN` the view-type selector (Scatter / Table / Series / Map / Trend) appears only inside the tile header, not in the top bar
- [x] `GIVEN` the workspace is in double or quad mode `WHEN` I view the dashboard `THEN` the view-type selector behaviour is unchanged

### Implementation notes

- **Delete UX**: the current delete button is in the tab bar in `app/dashboard/page.tsx`; change to appear on hover using the `group/tab` + `opacity-0 group-hover/tab:opacity-100` Tailwind pattern (same approach as preset delete in `FilterPresets.tsx`)
- **Rename**: replace the tab name `<span>` with a controlled `<input>` when editing; trigger on double-click (`onDoubleClick`); commit on Enter (`onKeyDown`) or blur; escape cancels
- **Auto-naming**: extract the highest N from existing tab names matching `/^Tab (\d+)$/i` and use N+1; fall back to `tabs.length + 1` if no tabs match the pattern
- **Single mode selector**: in `page.tsx`, find the branch that renders the view-type selector at the top level when `layoutConfig.mode === 'single'` and remove it; confirm the in-tile view selector already handles single mode (it should, as it's the same component used for double/quad slots)

## Completed

2026-03-19 — Improved tab bar UX: hover-to-delete, inline rename, smart auto-naming, removed redundant single-mode selector

- Delete (×) button now appears on hover using group/tab + opacity-0/group-hover/tab:opacity-100 pattern
- Double-click on tab name activates inline rename input; Enter/blur commits, Escape cancels
- New tab auto-naming extracts highest existing Tab N number + 1
- Removed single-mode view-type selector from top bar (in-tile header handles it)
