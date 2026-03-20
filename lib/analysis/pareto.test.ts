import { describe, it, expect } from 'vitest'
import { computeParetoFront } from './pareto'
import type { StravaActivity } from '../strava/types'

function makeActivity(id: number, distanceM: number, pace: number): StravaActivity {
  return {
    id,
    name: `Activity ${id}`,
    type: 'Run',
    sport_type: 'Run',
    start_date: '2024-01-01T00:00:00Z',
    start_date_local: '2024-01-01T00:00:00Z',
    distance: distanceM,
    moving_time: 3600,
    elapsed_time: 3600,
    total_elevation_gain: 0,
    average_speed: 1000 / pace,
    max_speed: 1000 / pace,
    map: { id: '', summary_polyline: '' },
  }
}

// pace getter: lower = faster = better (higherIsBetter=false)
const paceGetter = (a: StravaActivity) => (a.average_speed > 0 ? 1000 / a.average_speed : Infinity)

describe('computeParetoFront — pace mode (lowerIsBetter)', () => {
  it('returns all activities when each is best at its distance', () => {
    // short fast, medium medium, long slow: none dominates another
    const activities = [
      makeActivity(1, 5000, 240),   // 5 km, 4:00/km
      makeActivity(2, 10000, 300),  // 10 km, 5:00/km
      makeActivity(3, 21000, 360),  // 21 km, 6:00/km
    ]
    const front = computeParetoFront(activities, paceGetter, false)
    expect(front).toEqual(new Set([1, 2, 3]))
  })

  it('returns only the dominating activity when all others are dominated', () => {
    // Activity 3 is longest AND fastest — dominates 1 and 2
    const activities = [
      makeActivity(1, 5000, 300),
      makeActivity(2, 8000, 280),
      makeActivity(3, 10000, 240), // longest and fastest
    ]
    const front = computeParetoFront(activities, paceGetter, false)
    expect(front).toEqual(new Set([3]))
  })

  it('handles mixed dominance correctly', () => {
    // 1: 5km @ 4:00 — not dominated by 2 (2 is slower), but dominated by 3 (longer AND faster)
    // 2: 7km @ 5:00 — dominated by 3 (longer AND faster)
    // 3: 10km @ 3:30 — not dominated
    // 4: 3km @ 3:00 — not dominated (shorter than 3 but faster)
    const activities = [
      makeActivity(1, 5000, 240),
      makeActivity(2, 7000, 300),
      makeActivity(3, 10000, 210),
      makeActivity(4, 3000, 180),
    ]
    const front = computeParetoFront(activities, paceGetter, false)
    expect(front.has(3)).toBe(true)  // longest and fast
    expect(front.has(4)).toBe(true)  // shortest and fastest
    expect(front.has(1)).toBe(false) // dominated by 3
    expect(front.has(2)).toBe(false) // dominated by 3
  })

  it('treats exact ties as not dominating each other', () => {
    // Two identical activities — neither dominates the other
    const activities = [
      makeActivity(1, 10000, 300),
      makeActivity(2, 10000, 300),
    ]
    const front = computeParetoFront(activities, paceGetter, false)
    expect(front).toEqual(new Set([1, 2]))
  })

  it('returns empty set for empty input', () => {
    const front = computeParetoFront([], paceGetter, false)
    expect(front).toEqual(new Set())
  })
})

describe('computeParetoFront — age grade mode (higherIsBetter)', () => {
  const ageGradeGetter = (a: StravaActivity) => a.suffer_score ?? 0

  function makeAgeGradeActivity(id: number, distanceM: number, ageGrade: number): StravaActivity {
    return {
      ...makeActivity(id, distanceM, 300),
      suffer_score: ageGrade,
    }
  }

  it('returns all when each is best on a different axis', () => {
    // short high grade, long lower grade — neither dominates the other
    const activities = [
      makeAgeGradeActivity(1, 5000, 85),
      makeAgeGradeActivity(2, 10000, 70),
    ]
    const front = computeParetoFront(activities, ageGradeGetter, true)
    expect(front).toEqual(new Set([1, 2]))
  })

  it('returns only the dominant activity when one is longest and highest grade', () => {
    const activities = [
      makeAgeGradeActivity(1, 5000, 70),
      makeAgeGradeActivity(2, 8000, 75),
      makeAgeGradeActivity(3, 10000, 85), // longest and highest grade
    ]
    const front = computeParetoFront(activities, ageGradeGetter, true)
    expect(front).toEqual(new Set([3]))
  })
})
