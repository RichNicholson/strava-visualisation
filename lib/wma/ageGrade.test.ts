import { describe, it, expect } from 'vitest'
import { computeAgeGrade, timeForAgeGrade, getAgeFactor, ageAtDate } from './ageGrade'

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

  it('uses integer age only — fractional ages are floored, not interpolated', () => {
    // 42.9 should give the same result as 42 (floor), NOT be interpolated toward 43
    const at42 = getAgeFactor('M', 42, 10000)
    const at42_9 = getAgeFactor('M', 42.9, 10000)
    const at43 = getAgeFactor('M', 43, 10000)
    expect(at42_9).toEqual(at42)
    expect(at42_9).not.toEqual(at43)
  })

  it('factors decrease monotonically with integer age', () => {
    const at40 = getAgeFactor('M', 40, 10000)
    const at42 = getAgeFactor('M', 42, 10000)
    const at45 = getAgeFactor('M', 45, 10000)
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

describe('ageAtDate', () => {
  it('returns floor years when birthday has already passed in event year', () => {
    // DOB 1980-03-01, event 2025-06-01 → birthday passed, age = 45
    expect(ageAtDate('1980-03-01', '2025-06-01')).toBe(45)
  })

  it('returns floor years minus one when birthday has not yet passed', () => {
    // DOB 1980-09-01, event 2025-06-01 → birthday not yet passed, age = 44
    expect(ageAtDate('1980-09-01', '2025-06-01')).toBe(44)
  })

  it('returns correct age on the exact birthday', () => {
    // DOB 1980-06-01, event 2025-06-01 → exactly the birthday, age = 45
    expect(ageAtDate('1980-06-01', '2025-06-01')).toBe(45)
  })

  it('always returns an integer (no fractional years)', () => {
    const age = ageAtDate('1975-08-15', '2026-03-07')
    expect(Number.isInteger(age)).toBe(true)
  })
})

describe('MLDRRoadFactors2025 spot-checks', () => {
  // Values read directly from MLDRRoadFactors2025.xlsm — OC column and age columns
  it('men 5km world standard is ~769 s (≈13:29)', () => {
    // timeForAgeGrade at age with factor=1 (young elite) should equal the OC standard
    // Factor for age 20 on 5km is 1.0 in the MLDR table
    const t = timeForAgeGrade('M', 20, 5000, 100)
    expect(t).toBeCloseTo(769, 0)
  })

  it('men 5km age-60 factor is ~0.8075', () => {
    expect(getAgeFactor('M', 60, 5000)).toBeCloseTo(0.8075, 3)
  })

  it('women 10km standard and factors produce reasonable age grades', () => {
    // A 40-year-old woman running 10km in 40 minutes should score ~55-75%
    const grade = computeAgeGrade('F', 40, 10000, 40 * 60)
    expect(grade).toBeGreaterThan(50)
    expect(grade).toBeLessThan(80)
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
