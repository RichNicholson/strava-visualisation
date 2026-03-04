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
  pace: null,
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

  it('filters by average pace', () => {
    // 300 s/km = 5:00/km (average_speed 3.333 m/s)
    // 360 s/km = 6:00/km (average_speed 2.778 m/s)
    // 240 s/km = 4:00/km (average_speed 4.167 m/s)
    const activities = [
      makeActivity({ id: 1, average_speed: 4.167 }),  // 240 s/km — fast
      makeActivity({ id: 2, average_speed: 3.333 }),  // 300 s/km — in range
      makeActivity({ id: 3, average_speed: 2.778 }),  // 360 s/km — slow
    ]
    const result = applyFilter(activities, {
      ...noFilter,
      pace: { mode: 'average', range: { min: 270, max: 330 } },
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('filters by best split pace', () => {
    const activities = [
      makeActivity({ id: 1, best_splits: { '1000': 240 } }),  // 4:00/km
      makeActivity({ id: 2, best_splits: { '1000': 300 } }),  // 5:00/km — in range
      makeActivity({ id: 3 }),                                  // no split data — excluded
    ]
    const result = applyFilter(activities, {
      ...noFilter,
      pace: { mode: 'best_split', splitDistance: 1000, range: { min: 270, max: 330 } },
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('returns empty array for empty input', () => {
    expect(applyFilter([], noFilter)).toHaveLength(0)
  })
})
