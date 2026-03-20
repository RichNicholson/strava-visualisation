export type UnitSystem = 'metric' | 'imperial'

const METRES_PER_MILE = 1609.344

/** Format a distance in metres as a display string with unit suffix. */
export function formatDistance(metres: number, unit: UnitSystem): string {
  if (unit === 'imperial') {
    return `${(metres / METRES_PER_MILE).toFixed(2)} mi`
  }
  return `${(metres / 1000).toFixed(2)} km`
}

/**
 * Format a pace in seconds-per-km as a display string with unit suffix.
 * For imperial, converts to seconds-per-mile: s/km × (1000 / 1609.344).
 */
export function formatPace(sPerkm: number, unit: UnitSystem): string {
  const s = unit === 'imperial' ? sPerkm * (METRES_PER_MILE / 1000) : sPerkm
  let mins = Math.floor(s / 60)
  let secs = Math.round(s % 60)
  if (secs === 60) { mins += 1; secs = 0 }
  const suffix = unit === 'imperial' ? '/mi' : '/km'
  return `${mins}:${String(secs).padStart(2, '0')} ${suffix}`
}

/** Short axis label for distance depending on unit system. */
export function distanceUnit(unit: UnitSystem): string {
  return unit === 'imperial' ? 'mi' : 'km'
}

/** Short axis label for pace depending on unit system. */
export function paceUnit(unit: UnitSystem): string {
  return unit === 'imperial' ? 'min/mi' : 'min/km'
}

/**
 * Convert a distance value in metres to the display unit.
 * Use this when feeding raw data into a scale that expects the display unit.
 */
export function metresToDisplayUnit(metres: number, unit: UnitSystem): number {
  return unit === 'imperial' ? metres / METRES_PER_MILE : metres / 1000
}

/**
 * Convert a pace value in s/km to the display unit (s/km or s/mi).
 */
export function paceToDisplayUnit(sPerkm: number, unit: UnitSystem): number {
  return unit === 'imperial' ? sPerkm * (METRES_PER_MILE / 1000) : sPerkm
}
