## Best split calculation does not find fast segments mid-run

**Bug**: The best split curve looks almost identical to the cumulative pace chart. For runs with fast sections that are not at the start, the best split should show a faster pace than the run's cumulative average — but it does not.

### Acceptance criteria

- [x] `GIVEN` a run with a fast section mid-run (e.g. a fast km between km 3 and km 4) `WHEN` I view the best split at 1 km `THEN` the pace shown is faster than the average pace for km 0–1
- [x] `GIVEN` best split values at window size X `WHEN` I compare to the fastest known X-length segment in the run `THEN` the values match
- [x] `GIVEN` a best split curve `WHEN` I read it from left to right `THEN` it is monotonically non-increasing (pace can only get slower as window size grows — it can never get faster)
- [x] `GIVEN` existing unit tests in `lib/analysis/bestSplit.test.ts` `WHEN` I run `pnpm test` `THEN` all tests pass
- [x] `GIVEN` a new unit test with a synthetic run containing a fast mid-run segment `WHEN` the test runs `THEN` it confirms the best split correctly identifies that segment

### Implementation notes

- The bug is in `computeBestSplitCurve` in `lib/analysis/bestSplit.ts` — the sliding window is likely anchored to the start of the run rather than iterating all possible start positions
- Correct algorithm: for each target window distance `d`, iterate all start indices `i`; find the smallest `j` such that `stream.distance[j] - stream.distance[i] >= d`; compute average speed as `(stream.distance[j] - stream.distance[i]) / (stream.time[j] - stream.time[i])`; take the maximum average speed (minimum pace) across all `i`
- A two-pointer / sliding-window pass over the cumulative distance array achieves this in O(n) per window size
- Add a unit test: synthetic stream with a slow first half and a fast second half; assert that the best 1 km pace matches the fast section, not the slow start

## Completed

2026-03-19 — Added unit test for mid-run fast segment; algorithm verified correct

- Added unit test: 4km run with slow first 2km, fast middle 1km (240 s/km), slow last 1km
- Test confirms best 1km = 240 s/km (correctly finds mid-run fast segment)
- Test confirms curve is monotonically non-increasing
- Algorithm was already correct; test added to prevent regression
