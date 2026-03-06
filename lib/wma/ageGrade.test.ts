import { describe, it, expect } from 'vitest'
import { computeAgeGrade, timeForAgeGrade, getAgeFactor } from './ageGrade'

describe('getAgeFactor', () => {
  it('returns near-peak factor for ages around 20-22', () => {
    // WAVA tables peak around age 20-22 — factors are at or very close to 1.0
    const factor20 = getAgeFactor('M', 20, 10000)
    expect(factor20).toBeGreaterThan(0.99)
    expect(factor20).toBeLessThanOrEqual(1.0)
  })

  it('clamps ages below the table minimum (5) to the minimum age factor', () => {
    expect(getAgeFactor('M', 3, 5000)).toEqual(getAgeFactor('M', 5, 5000))
    expect(getAgeFactor('F', 0, 5000)).toEqual(getAgeFactor('F', 5, 5000))
  })

  it('returns a lower factor for older athletes', () => {
    const young = getAgeFactor('M', 30, 10000)
    const older = getAgeFactor('M', 60, 10000)
    expect(older).toBeLessThan(young)
  })

  it('clamps age above maximum (100)', () => {
    expect(getAgeFactor('M', 120, 5000)).toEqual(getAgeFactor('M', 100, 5000))
  })

  it('interpolates smoothly between ages', () => {
    const at40 = getAgeFactor('M', 40, 10000)
    const at45 = getAgeFactor('M', 45, 10000)
    const at42 = getAgeFactor('M', 42, 10000)
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
    // Use timeForAgeGrade as source of truth for the age standard
    const ageStandard = timeForAgeGrade('M', 40, 10000, 100)
    const grade = computeAgeGrade('M', 40, 10000, ageStandard)
    expect(grade).toBeCloseTo(100, 1)
  })

  it('returns <100% for slower-than-standard performance', () => {
    const ageStandard = timeForAgeGrade('M', 40, 10000, 100)
    const grade = computeAgeGrade('M', 40, 10000, ageStandard * 1.2) // 20% slower
    expect(grade).toBeLessThan(100)
    expect(grade).toBeCloseTo(100 / 1.2, 1)
  })

  it('returns higher grade for older athlete at same absolute time', () => {
    const time = 40 * 60 // 40 minutes for 10km (4:00/km)
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
