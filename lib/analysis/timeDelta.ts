/**
 * Linear interpolation: given sorted arrays xs and ys, find y at x.
 * Clamps to the first/last value when x is outside the range.
 * Returns NaN for empty or single-point arrays.
 */
export function lerp(xs: number[], ys: number[], x: number): number {
  const n = xs.length
  if (n < 2) return NaN
  if (x <= xs[0]) return ys[0]
  if (x >= xs[n - 1]) return ys[n - 1]

  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= x) lo = mid
    else hi = mid
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo])
  return ys[lo] + t * (ys[hi] - ys[lo])
}

/**
 * Compute a delta series between two (x, y) series via linear interpolation.
 *
 * Returns x values from the baseline x-array and delta = interp(comp, x) - baseline_y_at_x.
 * Only returns points within the comparison's x range.
 *
 * Typical uses:
 *  - Time delta (x = distance): baselineX=distance, baselineY=time, same for comp.
 *    delta > 0 means comparison is behind (slower) at that distance.
 *  - Distance delta (x = time): baselineX=time, baselineY=distance, same for comp.
 *    delta > 0 means comparison is ahead (more distance covered) at that time.
 */
export function computeDeltaSeries(
  baselineX: number[],
  baselineY: number[],
  compX: number[],
  compY: number[],
): { x: number; delta: number }[] {
  if (baselineX.length < 2 || compX.length < 2) return []

  const compMin = compX[0]
  const compMax = compX[compX.length - 1]

  const result: { x: number; delta: number }[] = []
  for (let i = 0; i < baselineX.length; i++) {
    const x = baselineX[i]
    if (x < compMin || x > compMax) continue
    const compYAtX = lerp(compX, compY, x)
    if (isFinite(baselineY[i]) && isFinite(compYAtX)) {
      result.push({ x, delta: compYAtX - baselineY[i] })
    }
  }
  return result
}
