## Pareto-optimal activity highlight on scatter plot

**As an** athlete
**I want** to see which of my activities are Pareto-optimal highlighted on the scatter plot
**So that** I can quickly identify my "best ever" performances — the runs that are unbeaten on at least one axis by any other run

### Acceptance criteria

- [ ] `GIVEN` the scatter plot is in pace-vs-distance mode `WHEN` the plot renders `THEN` activities that are Pareto-optimal (fastest pace for their distance, not dominated by any other point on both axes simultaneously) are visually distinguished (e.g. a ring, bold outline, or distinct fill)
- [ ] `GIVEN` the scatter plot is in age-grade-vs-distance mode `WHEN` the plot renders `THEN` Pareto-optimal activities (highest age grade for their distance) are similarly highlighted
- [ ] `GIVEN` an activity is Pareto-optimal `WHEN` I hover over it `THEN` the tooltip indicates it is on the Pareto front
- [ ] `GIVEN` a filter is applied that removes some activities `WHEN` the Pareto front is recalculated `THEN` it reflects only the currently visible activities
- [ ] The Pareto highlight does not obscure the rostered-activity highlight; the two states can coexist visually

### Implementation notes

- Relevant files: `components/plots/ScatterPlot.tsx`, `lib/analysis/` (add a pure `computeParetoFront(activities)` function for testability)
- Pareto-optimal in the pace/distance plane: a run is on the front if no other run is both longer AND faster (lower pace)
- Pareto-optimal in the age-grade/distance plane: a run is on the front if no other run is both longer AND has a higher age grade
- Compute the front once per filtered dataset (memo on the activities array)
- Keep the visual distinction subtle — e.g. a 2 px contrasting ring — so it doesn't dominate the plot
