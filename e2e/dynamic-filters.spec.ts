import { test, expect } from '@playwright/test'
import fixture from './fixtures/seed.json'
import { seedAndLoad } from './helpers/seed'
import type { E2EFixture } from '../lib/db/schema'

test.describe('US2 - Dynamic filter controls', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndLoad(page, fixture as E2EFixture)
  })

  test('date, distance, pace always visible', async ({ page }) => {
    const panel = page.locator('aside')
    await expect(panel.getByText('Date range', { exact: true })).toBeVisible()
    await expect(panel.getByText('Distance', { exact: true })).toBeVisible()
    await expect(panel.getByText('Pace', { exact: true })).toBeVisible()
  })

  test('heart rate section hidden by default', async ({ page }) => {
    // The HR label `<p>` only appears when the filter is active
    const panel = page.locator('aside')
    await expect(panel.locator('p', { hasText: 'Heart Rate' })).not.toBeVisible()
  })

  test('Add filter button is visible', async ({ page }) => {
    await expect(page.locator('aside').getByText('Add filter')).toBeVisible()
  })

  test('selecting Heart Rate from add-filter menu shows HR section', async ({ page }) => {
    const panel = page.locator('aside')
    await panel.getByText('Add filter').click()
    await panel.getByRole('button', { name: 'Heart Rate' }).click()
    await expect(panel.locator('p', { hasText: 'Heart Rate' })).toBeVisible()
  })

  test('removing Heart Rate filter clears it from the panel', async ({ page }) => {
    const panel = page.locator('aside')
    await panel.getByText('Add filter').click()
    await panel.getByRole('button', { name: 'Heart Rate' }).click()
    await expect(panel.locator('p', { hasText: 'Heart Rate' })).toBeVisible()
    await panel.getByRole('button', { name: 'Remove heart rate filter' }).click()
    await expect(panel.locator('p', { hasText: 'Heart Rate' })).not.toBeVisible()
    await expect(panel.getByText('Add filter')).toBeVisible()
  })
})
