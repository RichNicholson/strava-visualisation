import type { StravaActivity } from '../strava/types'

export interface RollingBestEntry {
  activity: StravaActivity          // qualifying run at this date
  definingActivity: StravaActivity  // the run that achieves rollingBestPace in this window
  rollingBestPace: number  // s/km — best in the window ending at this activity's date
  windowStart: Date
  windowEnd: Date
}

/**
 * Compute the rolling best pace for a target distance over time.
 *
 * For each qualifying activity (distance >= targetDistanceM - 300 m), treats that
 * activity's date as the end of a rolling window of `windowMonths` months and
 * finds the best (lowest) pace among all qualifying activities within that window.
 *
 * @param activities     All activities to consider
 * @param targetDistanceM  Target distance in metres (e.g. 5000 for 5k)
 * @param windowMonths   Rolling window size in months; 0 means all-time
 * @param getSpeed       Speed getter in m/s; defaults to moving speed (average_speed)
 */
export function computeRollingBest(
  activities: StravaActivity[],
  targetDistanceM: number,
  windowMonths: number,
  getSpeed: (a: StravaActivity) => number = (a) => a.average_speed,
): RollingBestEntry[] {
  const minDistance = targetDistanceM - 300

  const qualifying = activities
    .filter((a) => a.distance >= minDistance && getSpeed(a) > 0)
    .map((a) => ({ activity: a, date: new Date(a.start_date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (qualifying.length === 0) return []

  return qualifying.map(({ activity, date }) => {
    const windowEnd = date
    const windowStart = windowMonths === 0
      ? new Date(0)
      : new Date(date.getFullYear(), date.getMonth() - windowMonths, date.getDate())

    // Find all qualifying activities within [windowStart, windowEnd]
    const inWindow = qualifying.filter(
      (q) => q.date >= windowStart && q.date <= windowEnd,
    )

    // Best pace = min s/km (faster = lower value)
    const bestPace = Math.min(
      ...inWindow.map((q) => 1000 / getSpeed(q.activity)),
    )

    const bestInWindow = inWindow.reduce((best, q) =>
      1000 / getSpeed(q.activity) < 1000 / getSpeed(best.activity) ? q : best
    )

    return { activity, definingActivity: bestInWindow.activity, rollingBestPace: bestPace, windowStart, windowEnd }
  })
}
