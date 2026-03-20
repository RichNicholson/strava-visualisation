/**
 * Compute the best split curve for a GPS stream.
 *
 * For each unique sample distance d_i, treats d_i as a window size and finds
 * the minimum average pace (fastest contiguous block of d_i metres) anywhere
 * in the run. Returns a sorted array of {windowDist, bestPace} covering
 * MIN_WINDOW_M up to the total run distance.
 *
 * Algorithm: O(n²) worst case but typical streams are short enough.
 * For each window size w = distance[i] - distance[0] (i >= 1), sweep a
 * two-pointer across the stream to find the minimum average pace.
 *
 * @param distance - cumulative distance array in metres (must be non-decreasing)
 * @param time     - cumulative time array in seconds, aligned with distance
 * @returns array sorted ascending by windowDist; empty if stream is too short
 */
export function computeBestSplitCurve(
  distance: number[],
  time: number[],
): { windowDist: number; bestPace: number }[] {
  const n = distance.length
  if (n < 2 || distance[n - 1] - distance[0] < 1) return []

  const result: { windowDist: number; bestPace: number }[] = []

  // Sample window sizes at each distinct distance step from the stream
  // but cap to at most 500 samples for performance
  const totalDist = distance[n - 1] - distance[0]

  // Build a deduplicated list of candidate window sizes
  // We sample at stream resolution but downsample if stream is very long
  const step = Math.max(1, Math.floor(n / 500))
  const windowSizes: number[] = []
  for (let i = step; i < n; i += step) {
    const w = distance[i] - distance[0]
    if (w >= 1 && w <= totalDist) windowSizes.push(w)
  }
  // Always include the total distance
  if (windowSizes[windowSizes.length - 1] !== totalDist) windowSizes.push(totalDist)

  for (const w of windowSizes) {
    let bestTime = Infinity
    let left = 0
    for (let right = 1; right < n; right++) {
      // Advance left while the window exceeds w
      while (left < right - 1 && distance[right] - distance[left + 1] >= w) {
        left++
      }
      const windowDist = distance[right] - distance[left]
      if (windowDist < w) continue
      // Interpolate to exact window size
      const windowTime = time[right] - time[left]
      const ratio = w / windowDist
      const exactTime = windowTime * ratio
      if (exactTime < bestTime) bestTime = exactTime
    }
    if (isFinite(bestTime) && bestTime > 0) {
      result.push({ windowDist: w, bestPace: (bestTime / w) * 1000 })
    }
  }

  return result
}

/**
 * Best split pace computation using a two-pointer sliding window.
 * O(n) where n = number of stream data points.
 *
 * Returns the pace in seconds/km for the fastest continuous block
 * of exactly splitDistance metres, or null if the activity is too short.
 */
export function computeBestSplits(
  timeStream: number[],
  distStream: number[],
  splitDistance: number // metres
): number | null {
  const n = timeStream.length
  if (n < 2) return null

  const totalDist = distStream[n - 1] - distStream[0]
  if (totalDist < splitDistance) return null

  let bestTime = Infinity
  let left = 0

  for (let right = 1; right < n; right++) {
    // Advance left pointer until the window is exactly splitDistance
    while (left < right && distStream[right] - distStream[left] >= splitDistance) {
      const windowTime = timeStream[right] - timeStream[left]
      const windowDist = distStream[right] - distStream[left]

      // Interpolate to get exact splitDistance time
      const ratio = splitDistance / windowDist
      const exactTime = windowTime * ratio

      if (exactTime < bestTime) bestTime = exactTime
      left++
    }
  }

  if (!isFinite(bestTime)) return null

  // Convert to seconds/km
  return (bestTime / splitDistance) * 1000
}

/**
 * Format pace as "M:SS /km"
 */
export function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${secs.toString().padStart(2, '0')} /km`
}

/**
 * Parse pace string "M:SS" to seconds/km
 */
export function parsePace(paceStr: string): number {
  const parts = paceStr.split(':')
  if (parts.length !== 2) return 0
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}
