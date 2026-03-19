import { describe, it, expect } from 'vitest'
import { applyFilter } from './filter'
import type { StravaActivity, FilterState } from '../strava/types'

function makeActivity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 1,
    name: 'Morning Run',
    type: 'Run',
    sport_type: 'Run',
    start_date: '2024-06-15T07:00:00Z',
    start_date_local: '2024-06-15T07:00:00Z',
    distance: 10000,       // 10 km in metres
    moving_time: 3000,     // 50 min
    elapsed_time: 3100,
    total_elevation_gain: 50,
    average_speed: 3.333,  // 10 km/h → 300 s/km
    max_speed: 4.0,
    map: { id: 'a1', summary_polyline: '' },
    ...overrides,
  }
}

const noFilter: FilterState = {
  dateRange: null,
  distanceRange: null,
  sport: [],
  pace: { average: null },
  heartrate: null,
  elevationGain: null,
  sufferScore: null,
  movingTime: null,
  elapsedTime: null,
}

describe('applyFilter', () => {
  it('returns all activities when filter is empty', () => {
    const activities = [makeActivity({ id: 1 }), makeActivity({ id: 2 })]
    expect(applyFilter(activities, noFilter)).toHaveLength(2)
  })

  it('filters by sport_type', () => {
    const activities = [
      makeActivity({ id: 1, sport_type: 'Run' }),
      makeActivity({ id: 2, sport_type: 'Ride' }),
    ]
    const result = applyFilter(activities, { ...noFilter, sport: ['Run'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('falls back to type when sport_type is absent', () => {
    const activities = [
      makeActivity({ id: 1, sport_type: '', type: 'Run' }),
      makeActivity({ id: 2, sport_type: '', type: 'Ride' }),
    ]
    const result = applyFilter(activities, { ...noFilter, sport: ['Run'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('filters by distance range', () => {
    const activities = [
      makeActivity({ id: 1, distance: 4000 }),   // 4 km — below min
      makeActivity({ id: 2, distance: 8000 }),   // 8 km — in range
      makeActivity({ id: 3, distance: 12000 }),  // 12 km — above max
    ]
    const result = applyFilter(activities, {
      ...noFilter,
      distanceRange: { min: 5000, max: 11000 },
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('filters by date range', () => {
    const activities = [
      makeActivity({ id: 1, start_date: '2024-01-01T00:00:00Z' }),
      makeActivity({ id: 2, start_date: '2024-06-15T00:00:00Z' }),
      makeActivity({ id: 3, start_date: '2024-12-31T00:00:00Z' }),
    ]
    const result = applyFilter(activities, {
      ...noFilter,
      dateRange: { from: '2024-03-01T00:00:00Z', to: '2024-09-01T00:00:00Z' },
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('filters by average pace (elapsed)', () => {
    // elapsed pace = elapsed_time / (distance / 1000)
    // 240 s/km — fast: 10 km in 2400 s
    // 300 s/km — in range: 10 km in 3000 s
    // 360 s/km — slow: 10 km in 3600 s
    const activities = [
      makeActivity({ id: 1, distance: 10000, elapsed_time: 2400 }),  // 240 s/km — fast
      makeActivity({ id: 2, distance: 10000, elapsed_time: 3000 }),  // 300 s/km — in range
      makeActivity({ id: 3, distance: 10000, elapsed_time: 3600 }),  // 360 s/km — slow
    ]
    const result = applyFilter(activities, {
      ...noFilter,
      pace: { average: { min: 270, max: 330 } },
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('returns empty array for empty input', () => {
    expect(applyFilter([], noFilter)).toHaveLength(0)
  })

  describe('heart rate filter', () => {
    const withHR = (id: number, hr: number | undefined) =>
      makeActivity({ id, average_heartrate: hr })

    it('passes all activities when heartrate filter is null', () => {
      const activities = [withHR(1, 140), withHR(2, 170), withHR(3, undefined)]
      expect(applyFilter(activities, { ...noFilter, heartrate: null })).toHaveLength(3)
    })

    it('excludes activities outside the HR range', () => {
      const activities = [withHR(1, 130), withHR(2, 150), withHR(3, 175)]
      const result = applyFilter(activities, {
        ...noFilter,
        heartrate: { min: 140, max: 165, includeNoHR: false },
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(2)
    })

    it('excludes no-HR activities when includeNoHR is false', () => {
      const activities = [withHR(1, 150), withHR(2, undefined)]
      const result = applyFilter(activities, {
        ...noFilter,
        heartrate: { min: 140, max: 165, includeNoHR: false },
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('includes no-HR activities when includeNoHR is true', () => {
      const activities = [withHR(1, 150), withHR(2, undefined)]
      const result = applyFilter(activities, {
        ...noFilter,
        heartrate: { min: 140, max: 165, includeNoHR: true },
      })
      expect(result).toHaveLength(2)
    })
  })
})
