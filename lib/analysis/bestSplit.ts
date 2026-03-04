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
