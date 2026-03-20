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

  it('finds the fastest segment mid-run (slow start, fast middle, slow end)', () => {
    // 4km run: first 2km slow (360 s/km), km 2-3 fast (240 s/km), last 1km slow (360 s/km)
    const dist: number[] = []
    const time: number[] = []
    // 0-2000m: 36s/100m = 360 s/km
    // 2000-3000m: 24s/100m = 240 s/km
    // 3000-4000m: 36s/100m = 360 s/km
    for (let i = 0; i <= 40; i++) {
      dist.push(i * 100)
      if (i <= 20) time.push(i * 36)
      else if (i <= 30) time.push(20 * 36 + (i - 20) * 24)
      else time.push(20 * 36 + 10 * 24 + (i - 30) * 36)
    }
    const curve = computeBestSplitCurve(dist, time)
    expect(curve.length).toBeGreaterThan(0)
    // Best 1km pace should be 240 s/km (from the fast middle km), not 360 s/km
    const best1k = curve.find(p => p.windowDist >= 990 && p.windowDist <= 1010)
    expect(best1k).toBeDefined()
    expect(best1k!.bestPace).toBeCloseTo(240, 0)
    // Curve must be monotonically non-increasing (pace can only get slower as window grows)
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].bestPace).toBeGreaterThanOrEqual(curve[i - 1].bestPace - 1)
    }
  })

  it('finds fast intervals after a slow warmup (interval workout pattern)', () => {
    // 8km run:
    //   0-2km    warmup  8 min/km (480 s/km) — 48s/100m
    //   2-2.5km  fast #1 4 min/km (240 s/km) — 24s/100m
    //   2.5-3km  recovery 8 min/km
    //   3-3.5km  fast #2 4 min/km
    //   3.5-8km  cooldown 8 min/km
    //
    // The best window for a ~500m distance must reflect the fast interval pace,
    // NOT the warmup/cumulative-from-zero pace.  This would fail if the
    // two-pointer only ever evaluated windows starting at position 0.
    const dist: number[] = []
    const time: number[] = []
    const STEP = 100  // metres

    const segments: Array<[number, number]> = [
      [2000, 48],   // 0-2km  slow  (48s/100m = 480 s/km = 8 min/km)
      [500, 24],    // fast #1 (24s/100m = 240 s/km = 4 min/km)
      [500, 48],    // recovery
      [500, 24],    // fast #2
      [4500, 48],   // cooldown
    ]

    let d = 0
    let t = 0
    dist.push(d)
    time.push(t)
    for (const [len, sPerHundred] of segments) {
      for (let m = 0; m < len; m += STEP) {
        d += STEP
        t += sPerHundred
        dist.push(d)
        time.push(t)
      }
    }

    const curve = computeBestSplitCurve(dist, time)
    expect(curve.length).toBeGreaterThan(0)

    // Best 500m window should be ~240 s/km (4 min/km) from a fast interval,
    // not ~480 s/km (8 min/km) from the warmup.
    const best500 = curve.find(p => p.windowDist >= 490 && p.windowDist <= 510)
    expect(best500).toBeDefined()
    expect(best500!.bestPace).toBeCloseTo(240, 0)

    // Best 2km window should be faster than the warmup pace because it can
    // be positioned to include a fast interval.
    const best2k = curve.find(p => p.windowDist >= 1990 && p.windowDist <= 2010)
    expect(best2k).toBeDefined()
    expect(best2k!.bestPace).toBeLessThan(480)

    // Cumulative-from-zero pace at 500m is the warmup pace ≈ 480 s/km —
    // the best split must be strictly faster, proving it is NOT anchored at 0.
    const cumulativePaceAt500 = (time[5] / dist[5]) * 1000  // first 500m index
    expect(best500!.bestPace).toBeLessThan(cumulativePaceAt500 - 100)
  })
})
