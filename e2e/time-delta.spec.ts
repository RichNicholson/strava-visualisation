/**
 * US25: Time delta plot
 */
import { test, expect } from '@playwright/test'
import { seedAndLoad } from './helpers/seed'
// @ts-expect-error — fixture file is generated
import fixture from './fixtures/seed.json'

/**
 * Helper: go to dashboard in series mode with one roster item already added.
 * The fixture has a known stream for activity 14297965929; we look for a circle
 * near that activity in the scatter plot.
 */
async function setupSeriesWithRoster(page: Parameters<typeof seedAndLoad>[0], count = 2) {
  await seedAndLoad(page, fixture)
  // Filter to Runs only (default filter)
  // Click the first `count` scatter circles to add them to the roster
  const hits = page.locator('svg circle.hit-unselected')
  await expect(hits.first()).toBeAttached()
  for (let i = 0; i < count; i++) {
    await hits.nth(i).click({ force: true })
    await page.waitForTimeout(200)
  }
  // Switch to Series
  await page.getByRole('button', { name: 'Series', exact: true }).click()
  await page.waitForTimeout(600)
}

test.describe('time delta plot (US25)', () => {
  test('roster items have a star (baseline) button', async ({ page }) => {
    await seedAndLoad(page, fixture)
    const hits = page.locator('svg circle.hit-unselected')
    await expect(hits.first()).toBeAttached()
    await hits.first().click({ force: true })
    await page.waitForTimeout(300)

    // Star button should appear in the roster alongside each item
    const starBtn = page.getByTitle('Set as delta baseline')
    await expect(starBtn).toBeVisible()
  })

  test('clicking star designates baseline (turns indigo)', async ({ page }) => {
    await seedAndLoad(page, fixture)
    const hits = page.locator('svg circle.hit-unselected')
    await expect(hits.first()).toBeAttached()
    await hits.first().click({ force: true })
    await page.waitForTimeout(300)

    const starBtn = page.getByTitle('Set as delta baseline')
    await starBtn.click()
    await page.waitForTimeout(200)

    // After clicking, button title changes to "Clear baseline"
    const clearBtn = page.getByTitle('Clear baseline')
    await expect(clearBtn).toBeVisible()
  })

  test('clicking star again clears the baseline', async ({ page }) => {
    await seedAndLoad(page, fixture)
    const hits = page.locator('svg circle.hit-unselected')
    await expect(hits.first()).toBeAttached()
    await hits.first().click({ force: true })
    await page.waitForTimeout(300)

    // Set then clear
    const starBtn = page.getByTitle('Set as delta baseline')
    await starBtn.click()
    await page.waitForTimeout(200)
    const clearBtn = page.getByTitle('Clear baseline')
    await clearBtn.click()
    await page.waitForTimeout(200)

    // Should revert to 'Set as delta baseline' title
    await expect(page.getByTitle('Set as delta baseline')).toBeVisible()
  })

  test('series plot has a Δ delta button in the Y controls', async ({ page }) => {
    await setupSeriesWithRoster(page, 1)
    const deltaBtn = page.getByRole('button', { name: 'Δ delta' })
    await expect(deltaBtn).toBeVisible()
  })

  test('Δ delta button activates delta mode (turns indigo)', async ({ page }) => {
    await setupSeriesWithRoster(page, 1)
    const deltaBtn = page.getByRole('button', { name: 'Δ delta' })
    await deltaBtn.click()
    await page.waitForTimeout(300)
    await expect(deltaBtn).toHaveClass(/bg-indigo-600/)
  })

  test('delta mode without baseline shows a prompt message', async ({ page }) => {
    await setupSeriesWithRoster(page, 1)
    const deltaBtn = page.getByRole('button', { name: 'Δ delta' })
    await deltaBtn.click()
    await page.waitForTimeout(800)
    // No baseline set — should see prompt text in SVG
    const promptText = page.locator('svg text').filter({ hasText: /select a baseline/i })
    await expect(promptText).toBeVisible()
  })

  test('clicking the Δ delta button again exits delta mode', async ({ page }) => {
    await setupSeriesWithRoster(page, 1)
    const deltaBtn = page.getByRole('button', { name: 'Δ delta' })
    await deltaBtn.click()
    await page.waitForTimeout(200)
    await expect(deltaBtn).toHaveClass(/bg-indigo-600/)

    // Click again to toggle off
    await deltaBtn.click()
    await page.waitForTimeout(200)
    await expect(deltaBtn).not.toHaveClass(/bg-indigo-600/)
  })

  test('normal series behaves as today when no baseline is selected', async ({ page }) => {
    await setupSeriesWithRoster(page, 1)
    // Not in delta mode + no baseline → Δ delta button NOT indigo, no delta prompt in SVG
    const deltaBtn = page.getByRole('button', { name: 'Δ delta' })
    await expect(deltaBtn).not.toHaveClass(/bg-indigo-600/)
    // No delta prompt text should be visible
    const promptText = page.locator('svg text').filter({ hasText: /select a baseline/i })
    await expect(promptText).not.toBeVisible()
  })
})
