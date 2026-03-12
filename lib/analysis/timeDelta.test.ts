import { describe, it, expect } from 'vitest'
import { lerp, computeDeltaSeries } from './timeDelta'

describe('lerp', () => {
  it('returns NaN for empty arrays', () => {
    expect(lerp([], [], 5)).toBeNaN()
  })

  it('returns NaN for single-point arrays', () => {
    expect(lerp([5], [50], 5)).toBeNaN()
  })

  it('clamps to first value when x is below range', () => {
    expect(lerp([10, 20], [100, 200], 0)).toBe(100)
  })

  it('clamps to last value when x is above range', () => {
    expect(lerp([10, 20], [100, 200], 30)).toBe(200)
  })

  it('returns exact value at lower bound', () => {
    expect(lerp([0, 10], [0, 100], 0)).toBe(0)
  })

  it('returns exact value at upper bound', () => {
    expect(lerp([0, 10], [0, 100], 10)).toBe(100)
  })

  it('interpolates midpoint correctly', () => {
    expect(lerp([0, 10], [0, 100], 5)).toBe(50)
  })

  it('interpolates a quarter-point correctly', () => {
    expect(lerp([0, 100], [0, 400], 25)).toBeCloseTo(100)
  })

  it('handles non-uniform spacing', () => {
    expect(lerp([0, 50, 100], [0, 100, 150], 75)).toBeCloseTo(125)
  })
})

describe('computeDeltaSeries', () => {
  it('returns empty array when baseline has fewer than 2 points', () => {
    expect(computeDeltaSeries([0], [0], [0, 100], [0, 30])).toEqual([])
  })

  it('returns empty array when comparison has fewer than 2 points', () => {
    expect(computeDeltaSeries([0, 100], [0, 30], [0], [0])).toEqual([])
  })

  it('returns empty array for empty inputs', () => {
    expect(computeDeltaSeries([], [], [], [])).toEqual([])
  })

  it('computes zero delta for identical series', () => {
    const x = [0, 100, 200, 300]
    const y = [0, 30, 60, 90]
    const result = computeDeltaSeries(x, y, x, y)
    expect(result.length).toBe(4)
    result.forEach((p) => expect(p.delta).toBeCloseTo(0))
  })

  it('computes positive delta when comparison is slower (time delta)', () => {
    // baseline: steady 5:00/km — 300 s per km
    const baselineX = [0, 500, 1000]
    const baselineY = [0, 150, 300]
    // comparison: 6:00/km — 360 s per km
    const compX = [0, 500, 1000]
    const compY = [0, 180, 360]
    const result = computeDeltaSeries(baselineX, baselineY, compX, compY)
    expect(result.length).toBe(3)
    expect(result[2].delta).toBeCloseTo(60) // 60 s behind at 1 km
  })

  it('computes negative delta when comparison is faster', () => {
    const baselineX = [0, 500, 1000]
    const baselineY = [0, 150, 300]
    const compX = [0, 500, 1000]
    const compY = [0, 120, 240] // faster
    const result = computeDeltaSeries(baselineX, baselineY, compX, compY)
    expect(result[2].delta).toBeCloseTo(-60) // 60 s ahead
  })

  it('only returns points within the comparison x range', () => {
    const baselineX = [0, 200, 400, 600]
    const baselineY = [0, 40, 80, 120]
    // comparison only covers 100–500
    const compX = [100, 300, 500]
    const compY = [10, 30, 50]
    const result = computeDeltaSeries(baselineX, baselineY, compX, compY)
    expect(result.every((p) => p.x >= 100 && p.x <= 500)).toBe(true)
    expect(result.length).toBe(2) // x=200 and x=400
  })

  it('uses linear interpolation between comparison sample points', () => {
    // baseline: x=[0,100,200], y=[0,10,20]
    // comparison: x=[0,200], y=[0,30] — linear so at x=100, comp_y=15
    const baselineX = [0, 100, 200]
    const baselineY = [0, 10, 20]
    const compX = [0, 200]
    const compY = [0, 30]
    const result = computeDeltaSeries(baselineX, baselineY, compX, compY)
    const mid = result.find((p) => p.x === 100)
    expect(mid).toBeDefined()
    expect(mid!.delta).toBeCloseTo(5) // 15 - 10 = 5
  })

  it('preserves x values from baseline', () => {
    const baselineX = [0, 250, 500, 750, 1000]
    const baselineY = [0, 75, 150, 225, 300]
    const compX = [0, 1000]
    const compY = [0, 360]
    const result = computeDeltaSeries(baselineX, baselineY, compX, compY)
    expect(result.map((p) => p.x)).toEqual([0, 250, 500, 750, 1000])
  })
})
