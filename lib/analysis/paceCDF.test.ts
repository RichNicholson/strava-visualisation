import { describe, it, expect } from 'vitest'
import { computePaceCDF } from './paceCDF'

describe('computePaceCDF', () => {
  it('returns empty array when velocity array is empty', () => {
    expect(computePaceCDF([], [])).toEqual([])
  })

  it('returns empty array when all velocities are zero or invalid', () => {
    const result = computePaceCDF([0, 0, NaN, -1], [0, 1, 2, 3, 4])
    expect(result).toEqual([])
  })

  it('filters out pace values above 900 s/km (15 min/km)', () => {
    // pace = 1000 / velocity. To get pace ~901 s/km: velocity = 1000/901 ≈ 1.11 m/s
    // To get pace ~899 s/km: velocity = 1000/899 ≈ 1.11 m/s
    const tooSlow = 1000 / 901 // pace ~901 s/km — should be excluded
    const justFast = 1000 / 899 // pace ~899 s/km — should be included
    const result = computePaceCDF([tooSlow, justFast], [0, 1, 2])
    expect(result).toHaveLength(1)
    expect(result[0].pace).toBeCloseTo(899, 0)
  })

  it('produces a CDF that runs from 0 to 100 percent', () => {
    // uniform pace: 4 m/s → 250 s/km — all samples are same pace, edge case
    const velocity = [4, 4, 4, 4]
    const time = [0, 1, 2, 3, 4]
    const result = computePaceCDF(velocity, time)
    expect(result.length).toBeGreaterThan(0)
    // Last point (slowest = all time accumulated) must be 100%
    expect(result[result.length - 1].cumulativePercent).toBeCloseTo(100, 5)
    for (const p of result) {
      expect(p.cumulativePercent).toBeGreaterThan(0)
      expect(p.cumulativePercent).toBeLessThanOrEqual(100)
    }
  })

  it('returns points ordered from fastest to slowest pace (ascending pace values)', () => {
    // Mix of fast and slow samples
    const velocity = [5, 3, 4] // paces: 200, 333.3, 250 s/km
    const time = [0, 10, 20, 30]
    const result = computePaceCDF(velocity, time)
    // Returned order: fastest (lowest s/km) first, slowest (highest s/km) last
    for (let i = 1; i < result.length; i++) {
      expect(result[i].pace).toBeGreaterThanOrEqual(result[i - 1].pace)
    }
  })

  it('weights samples by duration, not count', () => {
    // Two velocities: slow (v=2, pace=500) for 9s, fast (v=10, pace=100) for 1s
    // Total duration = 10s
    // At pace ≤ 100 (fast): 10% of time (only the fast 1s sample)
    // At pace ≤ 500 (slow): 100% of time (all samples)
    const velocity = [2, 10]
    const time = [0, 9, 10]
    const result = computePaceCDF(velocity, time)
    // Ascending: result[0] ≈ {pace:~100, cum:~10%}, result[last] ≈ {pace:~500, cum:100%}
    expect(result[0].cumulativePercent).toBeCloseTo(10, 5)
    expect(result[result.length - 1].cumulativePercent).toBeCloseTo(100, 5)
    // Pace values should be near the bin midpoints for 100 and 500 s/km
    // With 5 s/km bins over 400 s/km range → 80 bins of width 5 s/km.
    // First occupied bin midpoint ≈ 102.5, last ≈ 497.5.
    expect(result[0].pace).toBeCloseTo(102.5, 0)
    expect(result[result.length - 1].pace).toBeCloseTo(497.5, 0)
  })

  it('handles a single valid sample', () => {
    const result = computePaceCDF([5], [0, 1])
    expect(result).toHaveLength(1)
    expect(result[0].pace).toBeCloseTo(200, 5)
    expect(result[0].cumulativePercent).toBeCloseTo(100, 5)
  })
})
