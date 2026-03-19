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
    // uniform pace: 4 m/s → 250 s/km
    const velocity = [4, 4, 4, 4]
    const time = [0, 1, 2, 3, 4]
    const result = computePaceCDF(velocity, time)
    expect(result.length).toBeGreaterThan(0)
    // The first element (slowest in reverse order) should be 100%
    expect(result[0].cumulativePercent).toBeCloseTo(100, 5)
    // The last element (fastest) should be near 0% ... but since all are same pace,
    // they all share 100% at that pace — last entry in ascending order gets 100%,
    // and reversed it becomes the first. All entries have 100% cumulative.
    for (const p of result) {
      expect(p.cumulativePercent).toBeGreaterThan(0)
      expect(p.cumulativePercent).toBeLessThanOrEqual(100)
    }
  })

  it('returns points ordered from slowest to fastest pace (descending pace values)', () => {
    // Mix of fast and slow samples
    const velocity = [5, 3, 4] // paces: 200, 333.3, 250 s/km
    const time = [0, 10, 20, 30]
    const result = computePaceCDF(velocity, time)
    // Returned order: slowest (highest s/km) first, fastest (lowest s/km) last
    for (let i = 1; i < result.length; i++) {
      expect(result[i].pace).toBeLessThanOrEqual(result[i - 1].pace)
    }
  })

  it('weights samples by duration, not count', () => {
    // Two velocities: slow (v=2, pace=500) for 9s, fast (v=10, pace=100) for 1s
    // Total duration = 10s
    // At pace ≤ 500 (slow): 100% of time (all samples)
    // At pace ≤ 100 (fast): 10% of time (only the fast 1s sample)
    const velocity = [2, 10]
    const time = [0, 9, 10]
    const result = computePaceCDF(velocity, time)
    // result[0] = slowest pace (500 s/km), cumulative should be 100%
    const slowPoint = result.find((p) => Math.abs(p.pace - 500) < 1)
    const fastPoint = result.find((p) => Math.abs(p.pace - 100) < 1)
    expect(slowPoint).toBeDefined()
    expect(fastPoint).toBeDefined()
    // In ascending order: fast (100 s/km) accumulates 1/10 = 10%, slow (500 s/km) 100%
    // After reversal: result[0] = {pace:500, cum:100}, result[1] = {pace:100, cum:10}
    expect(slowPoint!.cumulativePercent).toBeCloseTo(100, 5)
    expect(fastPoint!.cumulativePercent).toBeCloseTo(10, 5)
  })

  it('handles a single valid sample', () => {
    const result = computePaceCDF([5], [0, 1])
    expect(result).toHaveLength(1)
    expect(result[0].pace).toBeCloseTo(200, 5)
    expect(result[0].cumulativePercent).toBeCloseTo(100, 5)
  })
})
