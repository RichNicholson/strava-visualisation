import { type Page } from '@playwright/test'
import type { E2EFixture } from '../../lib/db/schema'

/**
 * Seed the browser's IndexedDB from a fixture file, then reload the dashboard.
 *
 * Usage:
 *   import fixture from '../fixtures/seed.json'
 *   import { seedAndLoad } from './seed'
 *
 *   test.beforeEach(async ({ page }) => {
 *     await seedAndLoad(page, fixture as E2EFixture)
 *   })
 */
export async function seedAndLoad(page: Page, fixture: E2EFixture): Promise<void> {
  // Navigate to root first so the E2ESeed component mounts and attaches window.__seed
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__seed === 'function', { timeout: 5000 })
  await page.evaluate((f) => window.__seed!(f), fixture)
  await page.goto('/dashboard')
  // Wait for at least one activity to appear — confirms seed worked
  await page.waitForSelector('[data-testid="activity-count"], svg circle, table tbody tr', { timeout: 10000 })
}
