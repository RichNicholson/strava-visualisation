import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Exclude Playwright E2E specs from the unit-test run
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
