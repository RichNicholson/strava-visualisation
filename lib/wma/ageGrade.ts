import wavaData from './wava-standards.json'

/**
 * Linear interpolation between two values
 */
function interpolate(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
}

/**
 * Find the indices of the two distances that bracket the target distance
 */
function findBracketingIndices(distance: number, distances: number[]): [number, number] {
  // If distance is less than or equal to the smallest distance
  if (distance <= distances[0]) {
    return [0, Math.min(1, distances.length - 1)]
  }

  // If distance is greater than or equal to the largest distance
  if (distance >= distances[distances.length - 1]) {
    return [Math.max(0, distances.length - 2), distances.length - 1]
  }

  // Find the bracketing indices
  for (let i = 0; i < distances.length - 1; i++) {
    if (distance >= distances[i] && distance <= distances[i + 1]) {
      return [i, i + 1]
    }
  }

  // Fallback (should never reach here)
  return [0, 1]
}

/**
 * Interpolate a value based on distance
 */
function interpolateByDistance(distance: number, distances: number[], values: number[]): number {
  const [idx0, idx1] = findBracketingIndices(distance, distances)

  if (idx0 === idx1) {
    return values[idx0]
  }

  return interpolate(distance, distances[idx0], distances[idx1], values[idx0], values[idx1])
}

/**
 * Get WAVA standard time (in seconds) for a given distance (in km) and gender
 */
function getWAVAStandard(distanceKm: number, sex: 'M' | 'F'): number {
  const data = sex === 'M' ? wavaData.men : wavaData.women
  return interpolateByDistance(distanceKm, data.distances, data.standards)
}

/**
 * Get WAVA age factor for a given distance (in km), age, and gender
 */
function getWAVAFactor(distanceKm: number, age: number, sex: 'M' | 'F'): number {
  const data = sex === 'M' ? wavaData.men : wavaData.women

  // Clamp age to valid range
  const clampedAge = Math.max(5, Math.min(100, age))

  // Get age factors for this age
  const ageKey = Math.floor(clampedAge).toString()
  const ageFactorsForAge = (data.ageFactors as Record<string, number[]>)[ageKey]

  if (!ageFactorsForAge) {
    console.warn(`No age factors found for age ${clampedAge}, defaulting to 1.0`)
    return 1.0
  }

  // Interpolate by distance. Age is always floored — no fractional interpolation
  // between integer ages. This matches commercial race scoring systems (parkrun,
  // RunScore) that use the athlete's integer age on the day of the event.
  return interpolateByDistance(distanceKm, data.distances, ageFactorsForAge)
}

/**
 * Calculate age-graded performance percentage for an athlete's performance.
 * @param sex - 'M' or 'F'
 * @param age - athlete age in years
 * @param distanceMetres - race distance in metres
 * @param athleteTimeSeconds - athlete's finishing time in seconds
 * @returns Age-graded percentage (0-100 scale, e.g., 75 for 75%)
 */
export function computeAgeGrade(
  sex: 'M' | 'F',
  age: number,
  distanceMetres: number,
  athleteTimeSeconds: number
): number {
  const distanceKm = distanceMetres / 1000
  const runnerSpeed = distanceKm / athleteTimeSeconds
  const standard = getWAVAStandard(distanceKm, sex)
  const factor = getWAVAFactor(distanceKm, age, sex)
  const ageGradedWRSpeed = (distanceKm / standard) * factor
  return (runnerSpeed / ageGradedWRSpeed) * 100
}

/**
 * For contour generation: given a desired age-grade %, sex, age, and distance,
 * return the athlete time (seconds) that achieves that grade.
 * @param sex - 'M' or 'F'
 * @param age - athlete age in years
 * @param distanceMetres - race distance in metres
 * @param targetGradePct - target age-grade percentage (0-100)
 * @returns Time in seconds to achieve the target grade
 */
export function timeForAgeGrade(
  sex: 'M' | 'F',
  age: number,
  distanceMetres: number,
  targetGradePct: number
): number {
  const distanceKm = distanceMetres / 1000
  const factor = getWAVAFactor(distanceKm, age, sex)
  const standard = getWAVAStandard(distanceKm, sex)
  // Age standard in km: runner who matches age standard gets grade 100%
  const ageStandardKm = standard / factor
  // Time to run that distance and achieve target grade
  return ageStandardKm / (targetGradePct / 100)
}

/**
 * Generate contour data for D3 line rendering.
 * Returns points in [distance_metres, pace_seconds_per_km] pairs.
 * @param sex - 'M' or 'F'
 * @param age - athlete age in years
 * @param targetGradePct - target age-grade percentage (0-100)
 * @param distancePoints - array of distances in metres
 * @returns Array of {distance, pace} objects for rendering
 */
export function generateAgeGradeContour(
  sex: 'M' | 'F',
  age: number,
  targetGradePct: number,
  distancePoints: number[]
): { distance: number; pace: number }[] {
  return distancePoints
    .map((distMetres) => {
      const time = timeForAgeGrade(sex, age, distMetres, targetGradePct)
      const pace = (time / distMetres) * 1000 // seconds/km
      return { distance: distMetres, pace }
    })
    .filter((d) => isFinite(d.pace) && d.pace > 0)
}

/**
 * Return the integer age (floor) of an athlete at the time of an event.
 * Accounts for whether the birthday has already occurred in the event year.
 * @param dateOfBirth - ISO date string (e.g. "1980-06-15")
 * @param eventDate - ISO date string of the activity start date
 */
export function ageAtDate(dateOfBirth: string, eventDate: string): number {
  const dob = new Date(dateOfBirth)
  const event = new Date(eventDate)
  const years = event.getFullYear() - dob.getFullYear()
  const birthdayThisYear = new Date(event.getFullYear(), dob.getMonth(), dob.getDate())
  return event >= birthdayThisYear ? years : years - 1
}

/**
 * Get age-grade factor for a given sex, age, and distance (metres).
 * This is kept for backwards compatibility.
 * @param sex - 'M' or 'F'
 * @param age - athlete age in years
 * @param distanceMetres - race distance in metres
 * @returns Age factor (0-1 scale, where 1.0 is no age adjustment)
 */
export function getAgeFactor(sex: 'M' | 'F', age: number, distanceMetres: number): number {
  const distanceKm = distanceMetres / 1000
  return getWAVAFactor(distanceKm, age, sex)
}
