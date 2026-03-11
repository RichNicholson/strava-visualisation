## Tileable and tabbable layout

**As an** athlete  
**I want** to arrange the dashboard views in a configurable tile/tab layout  
**So that** I can view multiple plots side by side and save my preferred arrangement

### Acceptance criteria

- [ ] `GIVEN` the dashboard loads `WHEN` I view the layout controls `THEN` I can choose between tabbed view (current) and tiled view
- [ ] `GIVEN` I select tiled view `WHEN` the layout changes `THEN` two or more plots render side by side in a grid
- [ ] `GIVEN` I am in tiled view `WHEN` I resize the browser `THEN` the tiles reflow responsively
- [ ] `GIVEN` I configure a layout `WHEN` I reload the page `THEN` my layout preference is restored
- [ ] `GIVEN` I am in tiled view `WHEN` I interact with a plot (e.g. filter, select) `THEN` all visible plots update in sync

### UI design decision (revised — v2 channel model)

UI concepts were reviewed in two rounds. The final design supersedes the earlier stacked/dual-axis binary with a general **channel model**. See `.github/concepts/US10-layout-concepts-v2.html` for interactive mockups.

---

#### 1. Channel model — per-metric axis positioning

Every metric added to a Series panel is a **channel**. Each channel is configured independently:

| Property | Type | Meaning |
|---|---|---|
| `metric` | `'pace' \| 'heartrate' \| 'elevation' \| 'cadence'` | Which data stream |
| `yTop` | `0–100` | Top edge of this channel's render band (% of plot height from top) |
| `yBottom` | `0–100` | Bottom edge of this channel's render band |
| `scaleMode` | `'auto' \| 'fixed'` | Auto-fit to data range, or user-specified bounds |
| `scaleMin` | `number \| null` | Lower scale bound in data units (only active when `fixed`) |
| `scaleMax` | `number \| null` | Upper scale bound in data units (only active when `fixed`) |

Channels with **non-overlapping** bands are equivalent to "stacked swimlanes". Channels with **fully overlapping** bands (both 0–100%) are equivalent to "dual-axis overlay". The user controls position directly — there is no separate mode toggle.

When bands overlap, lines for secondary channels are rendered dashed and at 0.7 opacity so both are legible.

---

#### 2. Multi-view layout manager — Tab / Split / Grid

The dashboard manages a set of **slot configs**. The layout mode determines how many slots are visible simultaneously:

- **Tab** — one slot visible. The top bar tab strip IS the slot selector (identical to today's UX — no regression).
- **Split** — two slots side-by-side, each with its own mini tab strip to switch its view type independently.
- **Grid** — 2×2, each of the four slots independently tabbed.

This resolves the earlier ambiguity: in Tab mode the tab bar selects the view; in Split/Grid mode each panel has its own tab bar and the top bar shows the layout dial instead.

---

#### 3. Layout presets — saveable named configurations

A **Layout Preset** captures the full arrangement: layout mode, which view type fills each slot, and — for Series slots — the complete channel configuration. Managed exactly like filter presets:

- Stored in `localStorage` as `layoutPresets[]`
- Named, loaded instantly on click
- Same `<details>` dropdown pattern as `FilterPresets.tsx`
- New hooks: `useLayoutPresets` (mirrors `useFilterPresets`), `LayoutPresetSelector` component (mirrors `FilterPresets.tsx`)

---

#### 4. Workbooks — filter preset × layout preset

A **Workbook** is a named save combining a filter preset and a layout preset. It is the unit of "analysis task" (e.g. "Marathon race review"). Loading a Workbook applies both in sequence.

Workbooks reference presets by id; they do not embed copies (see open questions).

---

### Open design questions before implementation

1. **Workbook self-contained vs referenced:** embed filter+layout config inline in the workbook (self-contained, survives preset deletion), or reference by id only (DRY, but brittle)?
2. **Overlapping channel rendering:** when two channels' bands overlap, draw with transparency + dashed secondary lines (current suggestion), or show a UI warning and refuse overlap?
3. **Scale units:** `scaleMin`/`scaleMax` stored in data-layer units (s/km, bpm, metres). Who converts when unit preference changes (km ↔ miles)?
4. **Workbook UX entry point:** top-bar dropdown, settings panel (`SettingsPanel.tsx`), or dedicated sidebar section?
5. **Migration:** existing `sessionStorage` scatter/series axis state must map cleanly to the new `SlotConfig` format on first load.
6. **Channel quick-preset strips:** should there be built-in quick presets per Series slot (e.g. "Pace+HR stacked", "Pace+HR overlaid") or only user-saved ones?

### Type definitions

```ts
// One metric rendered in a Series slot
interface Channel {
  metric:    'pace' | 'heartrate' | 'elevation' | 'cadence'
  yTop:      number        // 0–100 — top edge of band (% of plot height)
  yBottom:   number        // 0–100 — bottom edge of band
  scaleMode: 'auto' | 'fixed'
  scaleMin?: number | null // data-layer units; only active when scaleMode === 'fixed'
  scaleMax?: number | null
}

// One panel slot in the layout
interface SlotConfig {
  viewType: 'scatter' | 'series' | 'map' | 'table'
  channels: Channel[]      // only used when viewType === 'series'
}

// Saveable named layout arrangement
interface LayoutPreset {
  id:         string
  name:       string
  layoutMode: 'tab' | 'split' | 'grid'
  slots:      SlotConfig[] // length 1 for tab, 2 for split, 4 for grid
}

// Named combination of filter preset + layout preset
interface Workbook {
  id:             string
  name:           string
  filterPresetId: string
  layoutPresetId: string
  createdAt:      string
}
```

### Implementation notes

**Files to change:**
- `app/dashboard/page.tsx` — replace single `PlotMode` state with `LayoutConfig` (active preset or transient state); replace top bar tab strip logic with layout-mode-aware rendering
- `components/plots/SeriesPlot.tsx` — accept `channels: Channel[]` prop; map each channel to a D3 y-scale scoped to its `[yTop%, yBottom%]` band; render dashed lines + reduced opacity for overlapping channels
- `lib/strava/types.ts` — add `Channel`, `SlotConfig`, `LayoutPreset`, `Workbook`
- New: `hooks/useLayoutPresets.ts` (mirrors `useFilterPresets.ts`)
- New: `components/filter/LayoutPresetSelector.tsx` (mirrors `FilterPresets.tsx`)
- New: `hooks/useWorkbooks.ts`
- New: `components/ui/WorkbookSelector.tsx`

**Persistence:**
- Layout presets → `localStorage` key `layoutPresets`
- Workbooks → `localStorage` key `workbooks`
- Active layout config (unsaved) → `sessionStorage` (survives OAuth redirect)
- Do **not** put layout/workbook state in Dexie — it is UI preference, not activity data
