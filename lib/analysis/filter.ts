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

    // Heart rate filter
    if (filter.heartrate) {
      if (a.average_heartrate == null) {
        // Activity has no HR data — include only if explicitly opted in
        if (!filter.heartrate.includeNoHR) return false
      } else {
        if (a.average_heartrate < filter.heartrate.min || a.average_heartrate > filter.heartrate.max) return false
      }
    }

    // Elevation gain filter (metres)
    if (filter.elevationGain) {
      if (a.total_elevation_gain < filter.elevationGain.min || a.total_elevation_gain > filter.elevationGain.max) return false
    }

    // Suffer score filter — skip activities without a score
    if (filter.sufferScore) {
      if (a.suffer_score == null) return false
      if (a.suffer_score < filter.sufferScore.min || a.suffer_score > filter.sufferScore.max) return false
    }

    // Moving time filter (seconds)
    if (filter.movingTime) {
      if (a.moving_time < filter.movingTime.min || a.moving_time > filter.movingTime.max) return false
    }

    // Elapsed time filter (seconds)
    if (filter.elapsedTime) {
      if (a.elapsed_time < filter.elapsedTime.min || a.elapsed_time > filter.elapsedTime.max) return false
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

/** Returns the min/max average_heartrate across activities that have HR data, or null if none do. */
export function getHeartRateBounds(activities: StravaActivity[]): { min: number; max: number } | null {
  const hrs = activities
    .filter((a) => a.average_heartrate != null)
    .map((a) => a.average_heartrate!)
  if (hrs.length === 0) return null
  return { min: Math.floor(Math.min(...hrs)), max: Math.ceil(Math.max(...hrs)) }
}

/** Returns the min/max total_elevation_gain (metres) across all activities. */
export function getElevationGainBounds(activities: StravaActivity[]): { min: number; max: number } | null {
  if (activities.length === 0) return null
  const vals = activities.map((a) => a.total_elevation_gain)
  return { min: Math.floor(Math.min(...vals)), max: Math.ceil(Math.max(...vals)) }
}

/** Returns the min/max suffer_score across activities that have one, or null if none do. */
export function getSufferScoreBounds(activities: StravaActivity[]): { min: number; max: number } | null {
  const vals = activities.filter((a) => a.suffer_score != null).map((a) => a.suffer_score!)
  if (vals.length === 0) return null
  return { min: Math.floor(Math.min(...vals)), max: Math.ceil(Math.max(...vals)) }
}

/** Returns the min/max moving_time (seconds) across all activities. */
export function getMovingTimeBounds(activities: StravaActivity[]): { min: number; max: number } | null {
  if (activities.length === 0) return null
  const vals = activities.map((a) => a.moving_time)
  return { min: Math.floor(Math.min(...vals)), max: Math.ceil(Math.max(...vals)) }
}

/** Returns the min/max elapsed_time (seconds) across all activities. */
export function getElapsedTimeBounds(activities: StravaActivity[]): { min: number; max: number } | null {
  if (activities.length === 0) return null
  const vals = activities.map((a) => a.elapsed_time)
  return { min: Math.floor(Math.min(...vals)), max: Math.ceil(Math.max(...vals)) }
}
