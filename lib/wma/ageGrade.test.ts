import { describe, it, expect } from 'vitest'
import { computeAgeGrade, timeForAgeGrade, getAgeFactor } from './ageGrade'

describe('getAgeFactor', () => {
  it('returns 1.0 for peak-age athletes (20–30)', () => {
    expect(getAgeFactor('M', 20, 10000)).toBeCloseTo(1.0, 3)
    expect(getAgeFactor('M', 25, 5000)).toBeCloseTo(1.0, 3)
    expect(getAgeFactor('F', 30, 21097)).toBeCloseTo(1.0, 3)
  })

  it('returns a lower factor for older athletes', () => {
    const young = getAgeFactor('M', 30, 10000)
    const older = getAgeFactor('M', 50, 10000)
    expect(older).toBeLessThan(young)
  })

  it('clamps age below minimum (20)', () => {
    expect(getAgeFactor('M', 10, 5000)).toEqual(getAgeFactor('M', 20, 5000))
  })

  it('clamps age above maximum (80)', () => {
    expect(getAgeFactor('M', 90, 5000)).toEqual(getAgeFactor('M', 80, 5000))
  })

  it('interpolates smoothly between anchor ages', () => {
    const at40 = getAgeFactor('M', 40, 10000)
    const at45 = getAgeFactor('M', 45, 10000)
    const at42 = getAgeFactor('M', 42, 10000)
    // 42 should be between 40 and 45
    expect(at42).toBeLessThan(at40)
    expect(at42).toBeGreaterThan(at45)
  })

  it('interpolates smoothly between standard distances', () => {
    const at5k = getAgeFactor('M', 40, 5000)
    const at10k = getAgeFactor('M', 40, 10000)
    const at7k = getAgeFactor('M', 40, 7000)
    expect(at7k).toBeGreaterThan(Math.min(at5k, at10k))
    expect(at7k).toBeLessThan(Math.max(at5k, at10k))
  })
})

describe('computeAgeGrade', () => {
  it('returns ~100% when athlete matches the age standard', () => {
    // The age standard time is WR / factor, so running that time = 100%
    const factor = getAgeFactor('M', 40, 10000)
    const wrTime = 26 * 60 + 17.53  // men's 10k WR in seconds
    const ageStandard = wrTime / factor
    const grade = computeAgeGrade('M', 40, 10000, ageStandard)
    expect(grade).toBeCloseTo(100, 1)
  })

  it('returns <100% for slower-than-standard performance', () => {
    const factor = getAgeFactor('M', 40, 10000)
    const wrTime = 26 * 60 + 17.53
    const ageStandard = wrTime / factor
    const grade = computeAgeGrade('M', 40, 10000, ageStandard * 1.2)  // 20% slower
    expect(grade).toBeLessThan(100)
    expect(grade).toBeCloseTo(100 / 1.2, 1)
  })

  it('returns higher grade for younger athlete at same absolute time', () => {
    const time = 40 * 60  // 40 minutes for 10km (4:00/km)
    const grade40 = computeAgeGrade('M', 40, 10000, time)
    const grade60 = computeAgeGrade('M', 60, 10000, time)
    // Older athlete has a higher age standard, so same time = better grade
    expect(grade60).toBeGreaterThan(grade40)
  })

  it('gives reasonable grades for typical recreational runners', () => {
    // 50-year-old man running 10km in 50 minutes (5:00/km) — expect ~45-65%
    const grade = computeAgeGrade('M', 50, 10000, 50 * 60)
    expect(grade).toBeGreaterThan(40)
    expect(grade).toBeLessThan(70)
  })
})

describe('timeForAgeGrade', () => {
  it('is the inverse of computeAgeGrade', () => {
    const targetGrade = 65
    const time = timeForAgeGrade('F', 45, 21097, targetGrade)
    const actualGrade = computeAgeGrade('F', 45, 21097, time)
    expect(actualGrade).toBeCloseTo(targetGrade, 5)
  })

  it('returns a slower time for a lower target grade', () => {
    const time60 = timeForAgeGrade('M', 50, 10000, 60)
    const time40 = timeForAgeGrade('M', 50, 10000, 40)
    expect(time40).toBeGreaterThan(time60)
  })
})
