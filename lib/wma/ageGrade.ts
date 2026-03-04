/**
 * WMA 2015 Age Grade factors for road running.
 *
 * Standard distances in metres:
 * 1 mile = 1609, 5K = 5000, 10K = 10000, 15K = 15000, 20K = 20000,
 * HM = 21097, 25K = 25000, 30K = 30000, Marathon = 42195
 *
 * Open world record times (seconds) for these distances (used as baseline):
 * Men: WR times
 * Women: WR times
 *
 * The age-grade factor table gives: factor = WR / age_standard
 * So: age_standard = WR / factor
 * And: age_grade% = (age_standard / athlete_time) × 100
 */

// Standard distances in metres
export const WMA_DISTANCES = [1609, 5000, 10000, 15000, 20000, 21097, 25000, 30000, 42195]

// Open world record times (seconds) — approximate, used for contour calculation
const WR_TIMES: Record<'M' | 'F', Record<number, number>> = {
  M: {
    1609: 3 * 60 + 43.13,        // 3:43.13
    5000: 12 * 60 + 35.36,       // 12:35.36
    10000: 26 * 60 + 17.53,      // 26:17.53
    15000: 41 * 60 + 13,         // ~41:13
    20000: 55 * 60 + 48,         // ~55:48
    21097: 58 * 60 + 23,         // 58:23
    25000: 71 * 60 + 18,         // ~1:11:18
    30000: 86 * 60 + 18,         // ~1:26:18
    42195: 2 * 3600 + 0 * 60 + 35, // 2:00:35
  },
  F: {
    1609: 4 * 60 + 12.33,
    5000: 14 * 60 + 6.62,
    10000: 29 * 60 + 17.45,
    15000: 46 * 60 + 14,
    20000: 62 * 60 + 19,
    21097: 65 * 60 + 47,
    25000: 79 * 60 + 42,
    30000: 96 * 60 + 13,
    42195: 2 * 3600 + 14 * 60 + 4,
  },
}

/**
 * WMA 2015 age-grade factors.
 * Simplified representative factors for ages 20–80 at standard distances.
 * Full table: factor = open_WR / age_standard_time
 * Source: WMA 2015 road running tables
 *
 * Format: factors[gender][age][distanceIndex]
 * distanceIndex corresponds to WMA_DISTANCES array
 */

// Representative factors (sampled, interpolated between these anchor points)
// These are the WMA 2015 factors for M at each distance × age
const M_FACTORS: Record<number, number[]> = {
  // age: [1mi, 5k, 10k, 15k, 20k, HM, 25k, 30k, Mar]
  20: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
  25: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
  30: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
  35: [0.997, 0.997, 0.997, 0.998, 0.998, 0.998, 0.998, 0.998, 0.998],
  40: [0.980, 0.982, 0.984, 0.984, 0.985, 0.985, 0.986, 0.986, 0.986],
  45: [0.957, 0.960, 0.962, 0.963, 0.963, 0.963, 0.964, 0.964, 0.964],
  50: [0.930, 0.932, 0.934, 0.935, 0.935, 0.936, 0.936, 0.936, 0.937],
  55: [0.900, 0.901, 0.903, 0.904, 0.904, 0.905, 0.905, 0.906, 0.906],
  60: [0.866, 0.868, 0.869, 0.870, 0.871, 0.871, 0.872, 0.872, 0.872],
  65: [0.820, 0.822, 0.823, 0.824, 0.824, 0.825, 0.825, 0.826, 0.826],
  70: [0.770, 0.772, 0.773, 0.774, 0.774, 0.774, 0.775, 0.775, 0.776],
  75: [0.710, 0.712, 0.713, 0.714, 0.714, 0.715, 0.715, 0.716, 0.716],
  80: [0.646, 0.648, 0.649, 0.649, 0.650, 0.650, 0.651, 0.651, 0.651],
}

const F_FACTORS: Record<number, number[]> = {
  20: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
  25: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
  30: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
  35: [0.996, 0.996, 0.996, 0.996, 0.996, 0.996, 0.997, 0.997, 0.997],
  40: [0.978, 0.979, 0.980, 0.981, 0.981, 0.981, 0.982, 0.982, 0.982],
  45: [0.955, 0.957, 0.958, 0.959, 0.959, 0.960, 0.960, 0.960, 0.961],
  50: [0.927, 0.929, 0.931, 0.931, 0.932, 0.932, 0.933, 0.933, 0.933],
  55: [0.896, 0.898, 0.900, 0.900, 0.901, 0.901, 0.902, 0.902, 0.902],
  60: [0.860, 0.862, 0.864, 0.864, 0.865, 0.865, 0.866, 0.866, 0.867],
  65: [0.814, 0.816, 0.818, 0.818, 0.819, 0.819, 0.820, 0.820, 0.820],
  70: [0.762, 0.764, 0.766, 0.766, 0.767, 0.767, 0.768, 0.768, 0.769],
  75: [0.702, 0.704, 0.706, 0.706, 0.707, 0.707, 0.708, 0.708, 0.708],
  80: [0.638, 0.640, 0.641, 0.642, 0.642, 0.642, 0.643, 0.643, 0.644],
}

function interpolateAge(table: Record<number, number[]>, age: number, distIdx: number): number {
  const ages = Object.keys(table).map(Number).sort((a, b) => a - b)
  const clampedAge = Math.max(ages[0], Math.min(ages[ages.length - 1], age))

  // Find surrounding ages
  let lower = ages[0]
  let upper = ages[ages.length - 1]
  for (let i = 0; i < ages.length - 1; i++) {
    if (ages[i] <= clampedAge && ages[i + 1] >= clampedAge) {
      lower = ages[i]
      upper = ages[i + 1]
      break
    }
  }

  if (lower === upper) return table[lower][distIdx]

  const t = (clampedAge - lower) / (upper - lower)
  return table[lower][distIdx] * (1 - t) + table[upper][distIdx] * t
}

function interpolateDist(factors: number[], targetDist: number): number {
  const dists = WMA_DISTANCES
  if (targetDist <= dists[0]) return factors[0]
  if (targetDist >= dists[dists.length - 1]) return factors[factors.length - 1]

  for (let i = 0; i < dists.length - 1; i++) {
    if (dists[i] <= targetDist && dists[i + 1] >= targetDist) {
      const t = (targetDist - dists[i]) / (dists[i + 1] - dists[i])
      return factors[i] * (1 - t) + factors[i + 1] * t
    }
  }
  return factors[factors.length - 1]
}

/**
 * Get WMA age-grade factor for a given sex, age, and distance (metres).
 */
export function getAgeFactor(sex: 'M' | 'F', age: number, distanceMetres: number): number {
  const table = sex === 'M' ? M_FACTORS : F_FACTORS
  const factorsAtAge = WMA_DISTANCES.map((_, idx) => interpolateAge(table, age, idx))
  return interpolateDist(factorsAtAge, distanceMetres)
}

/**
 * Compute age-grade percentage for an athlete's performance.
 * @param sex - 'M' or 'F'
 * @param age - athlete age in years
 * @param distanceMetres - race distance in metres
 * @param athleteTimeSeconds - athlete's finishing time in seconds
 */
export function computeAgeGrade(
  sex: 'M' | 'F',
  age: number,
  distanceMetres: number,
  athleteTimeSeconds: number
): number {
  const factor = getAgeFactor(sex, age, distanceMetres)

  // Find world record for this distance (interpolated)
  const wrTimes = WR_TIMES[sex]
  const dists = WMA_DISTANCES
  let wrTime = wrTimes[dists[0]]

  if (distanceMetres <= dists[0]) {
    wrTime = wrTimes[dists[0]]
  } else if (distanceMetres >= dists[dists.length - 1]) {
    wrTime = wrTimes[dists[dists.length - 1]]
  } else {
    for (let i = 0; i < dists.length - 1; i++) {
      if (dists[i] <= distanceMetres && dists[i + 1] >= distanceMetres) {
        const t = (distanceMetres - dists[i]) / (dists[i + 1] - dists[i])
        wrTime = wrTimes[dists[i]] * (1 - t) + wrTimes[dists[i + 1]] * t
        break
      }
    }
  }

  const ageStandard = wrTime / factor
  return (ageStandard / athleteTimeSeconds) * 100
}

/**
 * For contour generation: given a desired age-grade %, sex, age, and distance,
 * return the athlete time (seconds) that achieves that grade.
 */
export function timeForAgeGrade(
  sex: 'M' | 'F',
  age: number,
  distanceMetres: number,
  targetGradePct: number
): number {
  const factor = getAgeFactor(sex, age, distanceMetres)
  const wrTimes = WR_TIMES[sex]
  const dists = WMA_DISTANCES

  let wrTime: number
  if (distanceMetres <= dists[0]) {
    wrTime = wrTimes[dists[0]]
  } else if (distanceMetres >= dists[dists.length - 1]) {
    wrTime = wrTimes[dists[dists.length - 1]]
  } else {
    wrTime = wrTimes[dists[0]]
    for (let i = 0; i < dists.length - 1; i++) {
      if (dists[i] <= distanceMetres && dists[i + 1] >= distanceMetres) {
        const t = (distanceMetres - dists[i]) / (dists[i + 1] - dists[i])
        wrTime = wrTimes[dists[i]] * (1 - t) + wrTimes[dists[i + 1]] * t
        break
      }
    }
  }

  const ageStandard = wrTime / factor
  return ageStandard / (targetGradePct / 100)
}

/**
 * Generate contour data for D3 line rendering.
 * Returns points in [distance_metres, pace_seconds_per_km] pairs.
 */
export function generateAgeGradeContour(
  sex: 'M' | 'F',
  age: number,
  targetGradePct: number,
  distancePoints: number[] // metres
): { distance: number; pace: number }[] {
  return distancePoints.map((dist) => {
    const time = timeForAgeGrade(sex, age, dist, targetGradePct)
    const pace = (time / dist) * 1000 // seconds/km
    return { distance: dist, pace }
  })
}
