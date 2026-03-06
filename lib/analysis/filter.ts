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

    // Pace filters — average and best-split are independent; either or both may be active
    if (filter.pace.average) {
      const pace = a.average_speed > 0 ? 1000 / a.average_speed : Infinity
      if (pace < filter.pace.average.min || pace > filter.pace.average.max) return false
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
    // Use fixed dates to avoid hydration mismatch (Date.now() differs between SSR and client)
    return { min: '2025-01-01T00:00:00.000Z', max: '2026-12-31T23:59:59.999Z' }
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

/** Returns the min/max average pace (s/km) across all activities that have speed data. */
export function getAveragePaceBounds(activities: StravaActivity[]): { min: number; max: number } {
  const paces = activities
    .filter((a) => a.average_speed > 0)
    .map((a) => 1000 / a.average_speed)
  if (paces.length === 0) return { min: 2 * 60, max: 12 * 60 }
  return { min: Math.min(...paces), max: Math.max(...paces) }
}
