import { describe, it, expect } from 'vitest'
import { computeBestSplits, computeBestSplitCurve } from './bestSplit'

describe('computeBestSplits', () => {
  it('returns null for streams with fewer than 2 points', () => {
    expect(computeBestSplits([], [], 1000)).toBeNull()
    expect(computeBestSplits([0], [0], 1000)).toBeNull()
  })

  it('returns null when total distance is less than split distance', () => {
    // 800m activity, looking for 1km split
    const time = [0, 100, 200, 300, 400]
    const dist = [0, 200, 400, 600, 800]
    expect(computeBestSplits(time, dist, 1000)).toBeNull()
  })

  it('computes correct pace for uniform-pace stream', () => {
    // 5 km at exactly 300 s/km (5:00/km), 1 point every 100m
    const time = Array.from({ length: 51 }, (_, i) => i * 30)   // 30s per 100m = 300s/km
    const dist = Array.from({ length: 51 }, (_, i) => i * 100)
    const pace = computeBestSplits(time, dist, 1000)
    expect(pace).not.toBeNull()
    expect(pace!).toBeCloseTo(300, 0)
  })

  it('finds the fastest 1km segment in a variable-pace stream', () => {
    // 4 km, first 2 km slow (360 s/km), last 2 km fast (240 s/km)
    const time: number[] = []
    const dist: number[] = []
    for (let i = 0; i <= 20; i++) {
      dist.push(i * 100)
      if (i <= 20) {
        // First 2km: 36s per 100m (360 s/km)
        // Last 2km: 24s per 100m (240 s/km)
        const elapsed = i <= 20
          ? i <= 10 ? i * 36 : 10 * 36 + (i - 10) * 24
          : 0
        time.push(elapsed)
      }
    }
    const pace = computeBestSplits(time, dist, 1000)
    expect(pace).not.toBeNull()
    // Best 1km should be ~240 s/km (from the fast segment)
    expect(pace!).toBeCloseTo(240, 0)
  })

  it('returns pace in seconds/km (not seconds/m)', () => {
    // 2km at 300 s/km: 600s total
    const time = [0, 300, 600]
    const dist = [0, 1000, 2000]
    const pace = computeBestSplits(time, dist, 1000)
    expect(pace).not.toBeNull()
    // 300s for 1km = 300 s/km, not 0.3
    expect(pace!).toBeGreaterThan(100)
    expect(pace!).toBeCloseTo(300, 0)
  })
})

describe('computeBestSplitCurve', () => {
  it('returns empty array for streams with fewer than 2 points', () => {
    expect(computeBestSplitCurve([], [])).toHaveLength(0)
    expect(computeBestSplitCurve([0], [0])).toHaveLength(0)
  })

  it('returns empty array when total distance is near zero', () => {
    expect(computeBestSplitCurve([0, 0], [0, 10])).toHaveLength(0)
  })

  it('returns an array sorted ascending by windowDist', () => {
    const dist = Array.from({ length: 21 }, (_, i) => i * 100)  // 0..2000m
    const time = Array.from({ length: 21 }, (_, i) => i * 30)   // 30s/100m = 300 s/km
    const curve = computeBestSplitCurve(dist, time)
    expect(curve.length).toBeGreaterThan(0)
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].windowDist).toBeGreaterThan(curve[i - 1].windowDist)
    }
  })

  it('returns pace in s/km and pace values decrease as window size increases for variable-pace stream', () => {
    // First 1km fast (240 s/km), second 1km slow (360 s/km)
    const dist: number[] = []
    const time: number[] = []
    for (let i = 0; i <= 20; i++) {
      dist.push(i * 100)
      time.push(i <= 10 ? i * 24 : 10 * 24 + (i - 10) * 36)
    }
    const curve = computeBestSplitCurve(dist, time)
    expect(curve.length).toBeGreaterThan(0)
    // All pace values should be in s/km range (> 100)
    for (const pt of curve) {
      expect(pt.bestPace).toBeGreaterThan(100)
    }
    // Smallest window should be faster or equal to largest window
    const first = curve[0].bestPace
    const last = curve[curve.length - 1].bestPace
    expect(first).toBeLessThanOrEqual(last)
  })

  it('returns uniform pace for a uniform-pace stream', () => {
    // 5km at exactly 300 s/km
    const dist = Array.from({ length: 51 }, (_, i) => i * 100)
    const time = Array.from({ length: 51 }, (_, i) => i * 30)
    const curve = computeBestSplitCurve(dist, time)
    expect(curve.length).toBeGreaterThan(0)
    for (const pt of curve) {
      expect(pt.bestPace).toBeCloseTo(300, 0)
    }
  })

  it('windowDist values do not exceed the total run distance', () => {
    const dist = Array.from({ length: 11 }, (_, i) => i * 100)  // 0..1000m
    const time = Array.from({ length: 11 }, (_, i) => i * 30)
    const curve = computeBestSplitCurve(dist, time)
    const totalDist = dist[dist.length - 1]
    for (const pt of curve) {
      expect(pt.windowDist).toBeLessThanOrEqual(totalDist)
    }
  })
})
