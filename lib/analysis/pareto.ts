import type { StravaActivity } from '../strava/types'

/**
 * Computes the Pareto front of a set of activities given a y-value getter.
 *
 * x-axis is always activity distance (higher = longer run).
 * For pace mode (higherIsBetter = false): a run is dominated if another run has
 *   both higher distance AND lower y (lower pace = faster). Pareto-optimal = not dominated.
 * For age-grade mode (higherIsBetter = true): a run is dominated if another run has
 *   both higher distance AND higher y. Pareto-optimal = not dominated.
 *
 * Returns the Set of activity IDs on the Pareto front.
 */
export function computeParetoFront(
  activities: StravaActivity[],
  yGetter: (a: StravaActivity) => number,
  higherIsBetter: boolean,
): Set<number> {
  const dominated = new Set<number>()

  for (let i = 0; i < activities.length; i++) {
    if (dominated.has(activities[i].id)) continue
    const ai = activities[i]
    const xi = ai.distance
    const yi = yGetter(ai)

    for (let j = 0; j < activities.length; j++) {
      if (i === j) continue
      if (dominated.has(activities[j].id)) continue
      const aj = activities[j]
      const xj = aj.distance
      const yj = yGetter(aj)

      // Does aj dominate ai?
      // aj dominates ai if: xj >= xi AND yj is better than yi (strictly on at least one)
      const longerOrEqual = xj >= xi
      const betterOrEqualY = higherIsBetter ? yj >= yi : yj <= yi
      const strictlyLonger = xj > xi
      const strictlyBetterY = higherIsBetter ? yj > yi : yj < yi

      if (longerOrEqual && betterOrEqualY && (strictlyLonger || strictlyBetterY)) {
        dominated.add(ai.id)
        break
      }
    }
  }

  const result = new Set<number>()
  for (const a of activities) {
    if (!dominated.has(a.id)) {
      result.add(a.id)
    }
  }
  return result
}
