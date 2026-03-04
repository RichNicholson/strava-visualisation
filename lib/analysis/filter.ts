import type { StravaActivity, FilterState } from '../strava/types'

/**
 * Pure filter function: applies a FilterState to a list of activities.
 */
export function applyFilter(activities: StravaActivity[], filter: FilterState): StravaActivity[] {
  return activities.filter((a) => {
    // Sport filter
    if (filter.sport.length > 0) {
      const sport = a.sport_type || a.type
      if (!filter.sport.includes(sport)) return false
    }

    // Date range filter
    if (filter.dateRange) {
      const date = new Date(a.start_date)
      const from = new Date(filter.dateRange.from)
      const to = new Date(filter.dateRange.to)
      if (date < from || date > to) return false
    }

    // Distance filter (metres)
    if (filter.distanceRange) {
      if (a.distance < filter.distanceRange.min) return false
      if (a.distance > filter.distanceRange.max) return false
    }

    // Pace filter
    if (filter.pace) {
      const { mode, splitDistance, range } = filter.pace

      if (mode === 'average') {
        // average_speed in m/s → pace in s/km
        const pace = a.average_speed > 0 ? 1000 / a.average_speed : Infinity
        if (pace < range.min || pace > range.max) return false
      } else if (mode === 'best_split' && splitDistance) {
        const key = String(splitDistance)
        const splitPace = a.best_splits?.[key]
        if (splitPace === undefined) return false // no stream data yet
        if (splitPace < range.min || splitPace > range.max) return false
      }
    }

    return true
  })
}

export function getDistanceBounds(activities: StravaActivity[]): { min: number; max: number } {
  if (activities.length === 0) return { min: 0, max: 50000 }
  const distances = activities.map((a) => a.distance)
  return {
    min: Math.min(...distances),
    max: Math.max(...distances),
  }
}

export function getDateBounds(activities: StravaActivity[]): { min: string; max: string } {
  if (activities.length === 0) {
    const now = new Date()
    const yearAgo = new Date(now)
    yearAgo.setFullYear(now.getFullYear() - 1)
    return { min: yearAgo.toISOString(), max: now.toISOString() }
  }
  const dates = activities.map((a) => a.start_date)
  return {
    min: dates.reduce((a, b) => (a < b ? a : b)),
    max: dates.reduce((a, b) => (a > b ? a : b)),
  }
}

export function getSportTypes(activities: StravaActivity[]): string[] {
  const types = new Set(activities.map((a) => a.sport_type || a.type))
  return Array.from(types).sort()
}
