export interface PaceCDFPoint {
  pace: number // s/km, higher = slower
  cumulativePercent: number // 0–100
}

/**
 * Compute the cumulative pace distribution (CDF) from a velocity stream.
 *
 * Returns an array ordered from slowest pace (high s/km) to fastest pace
 * (low s/km). Each point's cumulativePercent is the fraction of total time
 * spent at pace ≤ that value (i.e. at that pace or faster).
 *
 * @param velocity - velocity_smooth stream in m/s
 * @param time     - time array in seconds (same length as velocity)
 */
export function computePaceCDF(
  velocity: number[],
  time: number[],
): PaceCDFPoint[] {
  const MAX_PACE = 900 // s/km — 15 min/km upper limit

  interface Sample {
    pace: number
    duration: number
  }

  const samples: Sample[] = []
  const len = Math.min(velocity.length, time.length)

  for (let i = 0; i < len; i++) {
    const v = velocity[i]
    if (!v || v <= 0 || !isFinite(v)) continue

    const pace = 1000 / v
    if (!isFinite(pace) || pace > MAX_PACE) continue

    // Duration: use gap to next sample, or 1 s for the last sample
    const duration = i + 1 < time.length ? time[i + 1] - time[i] : 1
    if (duration <= 0) continue

    samples.push({ pace, duration })
  }

  if (samples.length === 0) return []

  // Sort by pace ascending (fastest first = lowest s/km first)
  samples.sort((a, b) => a.pace - b.pace)

  const totalDuration = samples.reduce((sum, s) => sum + s.duration, 0)

  // Build CDF: cumulative fraction of time at pace ≤ current sample's pace
  let cumulative = 0
  const ascending: PaceCDFPoint[] = samples.map((s) => {
    cumulative += s.duration
    return {
      pace: s.pace,
      cumulativePercent: (cumulative / totalDuration) * 100,
    }
  })

  // Return sorted slowest → fastest (reverse) for x-axis orientation:
  // left = slow (high pace), right = fast (low pace), curve increases left→right
  return ascending.slice().reverse()
}
