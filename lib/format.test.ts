import { describe, it, expect } from 'vitest'
import {
  formatDistance,
  formatPace,
  distanceUnit,
  paceUnit,
  metresToDisplayUnit,
  paceToDisplayUnit,
} from './format'

describe('formatDistance', () => {
  it('formats metric distance in km', () => {
    expect(formatDistance(5000, 'metric')).toBe('5.00 km')
    expect(formatDistance(10000, 'metric')).toBe('10.00 km')
    expect(formatDistance(1609.344, 'metric')).toBe('1.61 km')
  })

  it('formats imperial distance in miles', () => {
    expect(formatDistance(1609.344, 'imperial')).toBe('1.00 mi')
    expect(formatDistance(8046.72, 'imperial')).toBe('5.00 mi')
  })
})

describe('formatPace', () => {
  it('formats metric pace in min/km', () => {
    // 300 s/km = 5:00 /km
    expect(formatPace(300, 'metric')).toBe('5:00 /km')
    // 360 s/km = 6:00 /km
    expect(formatPace(360, 'metric')).toBe('6:00 /km')
    // 375 s/km = 6:15 /km
    expect(formatPace(375, 'metric')).toBe('6:15 /km')
  })

  it('rolls over seconds=60 into the next minute', () => {
    // 299.5 s/km rounds to 299.5 → secs = round(59.5) = 60 → should give 5:00 not 4:60
    expect(formatPace(299.5, 'metric')).toBe('5:00 /km')
  })

  it('formats imperial pace in min/mi (converts from s/km to s/mi)', () => {
    // 300 s/km × 1.609344 ≈ 482.80 s/mi → 8:02 /mi
    const result = formatPace(300, 'imperial')
    expect(result).toMatch(/\d+:\d{2} \/mi/)
    // Sanity: 300 s/km × 1.609344 ≈ 482.8 s/mi → ~8 min
    expect(result.startsWith('8:')).toBe(true)
  })
})

describe('distanceUnit', () => {
  it('returns km for metric', () => expect(distanceUnit('metric')).toBe('km'))
  it('returns mi for imperial', () => expect(distanceUnit('imperial')).toBe('mi'))
})

describe('paceUnit', () => {
  it('returns min/km for metric', () => expect(paceUnit('metric')).toBe('min/km'))
  it('returns min/mi for imperial', () => expect(paceUnit('imperial')).toBe('min/mi'))
})

describe('metresToDisplayUnit', () => {
  it('converts metres to km for metric', () => {
    expect(metresToDisplayUnit(5000, 'metric')).toBeCloseTo(5.0)
    expect(metresToDisplayUnit(10000, 'metric')).toBeCloseTo(10.0)
  })

  it('converts metres to miles for imperial', () => {
    expect(metresToDisplayUnit(1609.344, 'imperial')).toBeCloseTo(1.0)
    expect(metresToDisplayUnit(8046.72, 'imperial')).toBeCloseTo(5.0)
  })
})

describe('paceToDisplayUnit', () => {
  it('returns s/km unchanged for metric', () => {
    expect(paceToDisplayUnit(300, 'metric')).toBe(300)
    expect(paceToDisplayUnit(360, 'metric')).toBe(360)
  })

  it('converts s/km to s/mi for imperial', () => {
    // 300 s/km × 1609.344/1000 ≈ 482.80 s/mi
    expect(paceToDisplayUnit(300, 'imperial')).toBeCloseTo(482.8, 0)
    expect(paceToDisplayUnit(360, 'imperial')).toBeCloseTo(579.36, 0)
  })
})
