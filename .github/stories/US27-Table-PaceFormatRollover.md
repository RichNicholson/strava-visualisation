## Pace formatting rollover in activity table

**Bug**: Pace values with seconds ≥ 60 are displayed as-is (e.g. `4:60`) instead of rolling over correctly (e.g. `5:00`).

### Acceptance criteria

- [x] `GIVEN` an activity whose computed pace rounds to a value where seconds = 60 `WHEN` displayed in the activity table `THEN` the seconds roll over into the minutes and the display reads correctly (e.g. `5:00` not `4:60`)
- [x] `GIVEN` any pace value in the activity table `WHEN` displayed `THEN` seconds are always in the range 00–59

## Completed

2026-03-19 — Fixed pace rollover in `formatPace` in `lib/format.ts`; added regression test.

- `lib/format.ts`: added `if (secs === 60) { mins += 1; secs = 0 }` guard after `Math.round`
- `lib/format.test.ts`: added test for 299.5 s/km → `5:00 /km` (the rollover boundary)

### Implementation notes

- Relevant file: `components/table/ActivityTable.tsx` (pace display formatting only — the bug is not reported elsewhere)
- Fix is in the display-layer formatting function; the data layer stores pace in seconds/km and is unaffected
