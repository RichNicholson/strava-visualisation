import { describe, it, expect } from 'vitest'
import { computeRollingBest } from './longitudinal'
import type { StravaActivity } from '../strava/types'

function makeActivity(overrides: Partial<StravaActivity> & { id: number; start_date: string; distance: number; average_speed: number }): StravaActivity {
  return {
    name: 'Test Run',
    type: 'Run',
    sport_type: 'Run',
    start_date_local: overrides.start_date,
    moving_time: 1800,
    elapsed_time: 1800,
    total_elevation_gain: 0,
    max_speed: overrides.average_speed * 1.2,
    map: { id: 'x', summary_polyline: '' },
    ...overrides,
  }
}

describe('computeRollingBest', () => {
  it('returns empty array when no activities qualify', () => {
    const activities = [
      makeActivity({ id: 1, start_date: '2024-01-01T00:00:00Z', distance: 4000, average_speed: 3.0 }),
    ]
    const result = computeRollingBest(activities, 5000, 6)
    expect(result).toHaveLength(0)
  })

  it('includes activities within 300 m leeway of target distance', () => {
    const activities = [
      // 4700 m is 300 m short of 5000 m — should qualify
      makeActivity({ id: 1, start_date: '2024-01-01T00:00:00Z', distance: 4700, average_speed: 3.5 }),
      // 4699 m is just outside the leeway — should not qualify
      makeActivity({ id: 2, start_date: '2024-02-01T00:00:00Z', distance: 4699, average_speed: 4.0 }),
    ]
    const result = computeRollingBest(activities, 5000, 6)
    expect(result).toHaveLength(1)
    expect(result[0].activity.id).toBe(1)
  })

  it('returns one entry per qualifying activity sorted by date', () => {
    const activities = [
      makeActivity({ id: 1, start_date: '2024-03-01T00:00:00Z', distance: 5100, average_speed: 3.2 }),
      makeActivity({ id: 2, start_date: '2024-01-01T00:00:00Z', distance: 5200, average_speed: 3.5 }),
    ]
    const result = computeRollingBest(activities, 5000, 6)
    expect(result).toHaveLength(2)
    // Should be sorted ascending by date
    expect(result[0].activity.id).toBe(2)
    expect(result[1].activity.id).toBe(1)
  })

  it('rolling best pace is the minimum s/km in the window', () => {
    // Activity 1 at Jan: speed 3.0 m/s → pace 333.3 s/km
    // Activity 2 at Feb: speed 3.5 m/s → pace 285.7 s/km
    // Activity 3 at Mar: speed 3.0 m/s → pace 333.3 s/km
    // With 6-month window, activity 3's window includes all three; best is activity 2's pace
    const activities = [
      makeActivity({ id: 1, start_date: '2024-01-01T00:00:00Z', distance: 5100, average_speed: 3.0 }),
      makeActivity({ id: 2, start_date: '2024-02-01T00:00:00Z', distance: 5100, average_speed: 3.5 }),
      makeActivity({ id: 3, start_date: '2024-03-01T00:00:00Z', distance: 5100, average_speed: 3.0 }),
    ]
    const result = computeRollingBest(activities, 5000, 6)
    // For activity 1 (Jan), window goes back to Jul 2023 — only activity 1 in window
    expect(result[0].rollingBestPace).toBeCloseTo(1000 / 3.0, 1)
    // For activity 3 (Mar), window includes activities 1, 2, 3 — best is activity 2
    expect(result[2].rollingBestPace).toBeCloseTo(1000 / 3.5, 1)
  })

  it('windowMonths=0 means all-time (window from epoch)', () => {
    const activities = [
      makeActivity({ id: 1, start_date: '2020-01-01T00:00:00Z', distance: 5100, average_speed: 4.0 }),
      makeActivity({ id: 2, start_date: '2024-06-01T00:00:00Z', distance: 5100, average_speed: 3.0 }),
    ]
    const result = computeRollingBest(activities, 5000, 0)
    // Activity 2's window should include activity 1 (all-time); activity 1 is faster
    expect(result[1].rollingBestPace).toBeCloseTo(1000 / 4.0, 1)
    // windowStart for all-time should be epoch (year 1970)
    expect(result[1].windowStart.getFullYear()).toBe(1970)
  })

  it('excludes activities outside the rolling window', () => {
    // Activity 1 in Jan 2023, activity 2 in Jan 2024 — 12 months apart
    // With a 6-month window, activity 2's window starts Jul 2023, so activity 1 is excluded
    const activities = [
      makeActivity({ id: 1, start_date: '2023-01-01T00:00:00Z', distance: 5100, average_speed: 5.0 }),
      makeActivity({ id: 2, start_date: '2024-01-01T00:00:00Z', distance: 5100, average_speed: 3.0 }),
    ]
    const result = computeRollingBest(activities, 5000, 6)
    // Activity 2's window only includes itself (activity 1 is outside)
    expect(result[1].rollingBestPace).toBeCloseTo(1000 / 3.0, 1)
  })
})
