export interface PaceCDFPoint {
  pace: number // s/km, higher = slower
  cumulativePercent: number // 0–100
}

/**
 * Compute the cumulative pace distribution (CDF) from a velocity stream.
 *
 * Returns points ordered fastest → slowest (ascending pace / ascending s/km).
 * Each point's cumulativePercent is the fraction of total moving time spent at
 * that pace or faster (i.e. pace ≤ this value).
 *
 * The optional `moving` array (Strava's MovingStream boolean) is the
 * authoritative filter: samples where moving[i] is false are excluded even if
 * velocity_smooth is still non-zero (which happens during ramp-down after a
 * stop due to the ~30 s smoothing window). When moving is absent, falls back
 * to excluding samples with velocity ≤ 0.
 *
 * Samples are binned into 5 s/km wide pace buckets before accumulation so that
 * quantised or closely-clustered velocity values don't create jagged steps in
 * the curve. Using a fixed width (rather than fixed count) prevents narrow-range
 * runs from being split into sub-second bins that preserve quantisation spikes.
 *
 * @param velocity - velocity_smooth stream in m/s
 * @param time     - time array in seconds (same length as velocity)
 * @param moving   - optional boolean moving-stream (same length as velocity)
 */
export function computePaceCDF(
  velocity: number[],
  time: number[],
  moving?: boolean[],
): PaceCDFPoint[] {
  const MAX_PACE = 900 // s/km — 15 min/km upper limit

  // Collect valid (pace, duration) samples
  const samples: { pace: number; duration: number }[] = []
  const len = Math.min(velocity.length, time.length)
  const hasMoving = moving && moving.length > 0

  for (let i = 0; i < len; i++) {
    // Use the Strava moving stream as the authoritative moving/stopped filter
    // when available; otherwise fall back to velocity > 0.
    if (hasMoving ? !moving![i] : (!velocity[i] || velocity[i] <= 0 || !isFinite(velocity[i]))) continue

    const v = velocity[i]
    if (!v || v <= 0 || !isFinite(v)) continue

    const pace = 1000 / v
    if (!isFinite(pace) || pace > MAX_PACE) continue

    const duration = i + 1 < time.length ? time[i + 1] - time[i] : 1
    if (duration <= 0) continue

    samples.push({ pace, duration })
  }

  if (samples.length === 0) return []

  const paces = samples.map((s) => s.pace)
  const paceMin = Math.min(...paces)
  const paceMax = Math.max(...paces)

  // Edge case: all samples at the same pace
  if (paceMin === paceMax) {
    return [{ pace: paceMin, cumulativePercent: 100 }]
  }

  // Bin samples into fixed-width pace buckets. A fixed width (rather than fixed
  // count) ensures narrow-range runs aren't split into sub-second bins that
  // preserve velocity_smooth quantisation spikes.
  const BIN_WIDTH_SKM = 5
  const NUM_BINS = Math.max(1, Math.ceil((paceMax - paceMin) / BIN_WIDTH_SKM))
  const binWidth = (paceMax - paceMin) / NUM_BINS
  const bins = new Array<number>(NUM_BINS).fill(0)
  for (const s of samples) {
    const idx = Math.min(Math.floor((s.pace - paceMin) / binWidth), NUM_BINS - 1)
    bins[idx] += s.duration
  }

  const totalDuration = samples.reduce((sum, s) => sum + s.duration, 0)

  // Build CDF ascending: fastest (lowest s/km) → slowest (highest s/km)
  const result: PaceCDFPoint[] = []
  let cumulative = 0
  for (let i = 0; i < NUM_BINS; i++) {
    if (bins[i] === 0) continue
    cumulative += bins[i]
    result.push({
      pace: paceMin + (i + 0.5) * binWidth, // bin midpoint
      cumulativePercent: (cumulative / totalDuration) * 100,
    })
  }

  return result
}
