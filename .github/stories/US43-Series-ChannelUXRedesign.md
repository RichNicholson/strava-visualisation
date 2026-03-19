## Series channel controls UX redesign

**As an** athlete
**I want** to configure series plot channels with fewer clicks and no hidden interactions
**So that** I spend less time fighting the UI and more time analysing data

### Acceptance criteria

- [x] `GIVEN` the series plot is displayed `WHEN` I click a channel row `THEN` its settings expand inline below the row — no floating dialog appears
- [x] `GIVEN` a channel is expanded `WHEN` I click the row again `THEN` the settings collapse (no separate "close" button required, though a visible collapse affordance is acceptable)
- [x] `GIVEN` a channel is expanded `WHEN` I change any setting (metric, scale mode, axis side) `THEN` the change takes effect immediately with no additional confirmation step
- [x] `GIVEN` "Best Split" or "Pace CDF" mode is active `WHEN` I view the channel area `THEN` the channel list is hidden and a short label explains that channel controls are unavailable in this mode
- [x] `GIVEN` I view the special mode buttons `WHEN` I read the labels `THEN` they read "Best Split" and "Pace CDF" (capitalised consistently — fix any lowercase "best split" instances)
- [x] `GIVEN` I need to change a channel metric `WHEN` I count the interactions `THEN` it takes at most 2 clicks (expand row → select metric), down from the current 3+

### Implementation notes

**Proposed design — inline accordion:**

- Replace the floating dialog/popup with an accordion: each channel row has an `isExpanded` state; expanded content renders inline below the row as normal document flow (not absolutely positioned)
- Use a single `openChannelIndex: number | null` state so at most one channel is expanded at a time; opening a second channel collapses the first
- The expanded panel contains the same controls as the current dialog (metric picker, scale mode, side selector); clicking the channel row header again collapses it
- A small chevron icon on the row (▼/▲) makes the expand/collapse affordance obvious

**Special modes (Best Split / Pace CDF):**

- These remain as toggle buttons at the top of the controls area, clearly separated from the channel list (e.g. a divider or group label "View mode")
- When either is active, hide the channel list entirely and replace it with a muted one-line note: `"Channel config not available in this mode"`
- When deactivated, the channel list returns

**Capitalisation:**

- Search `components/plots/SeriesPlot.tsx` for `"best split"` (lowercase) and replace with `"Best Split"`; confirm `"Pace CDF"` is already correctly capitalised

## Completed

2026-03-19 — Series channel controls redesigned: inline accordion, capitalisation fix, special mode note

- Fixed "best split" → "Best Split" capitalisation on toggle button
- Replaced floating dialog with inline accordion below the controls bar
- Added ▼/▲ chevron to channel pills indicating expand state
- One channel expanded at a time (opening second collapses first)
- Added "Channel config not available in this mode" note when bestsplit/pacecdf active with multiChannel
