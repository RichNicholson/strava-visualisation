import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration.
 *
 * Before running tests you need a seed fixture at e2e/fixtures/seed.json.
 * Generate it from the app: open Settings → "Export test fixture" with the
 * runs you want stream data for already in the roster.
 *
 * Run tests:
 *   pnpm e2e       # assumes dev server already running on :3000
 *   pnpm e2e:ci    # starts dev server automatically before running tests
 *   pnpm e2e:ui    # open interactive Playwright UI
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start the dev server when running `pnpm e2e:ci`.
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
