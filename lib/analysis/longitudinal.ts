import type { StravaActivity } from '../strava/types'

export interface RollingBestEntry {
  activity: StravaActivity
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
 */
export function computeRollingBest(
  activities: StravaActivity[],
  targetDistanceM: number,
  windowMonths: number,
): RollingBestEntry[] {
  const minDistance = targetDistanceM - 300

  const qualifying = activities
    .filter((a) => a.distance >= minDistance && a.average_speed > 0)
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
      ...inWindow.map((q) => 1000 / q.activity.average_speed),
    )

    return { activity, rollingBestPace: bestPace, windowStart, windowEnd }
  })
}
