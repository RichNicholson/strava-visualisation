'use client'

/**
 * E2ESeed — attaches `window.__seed(fixture)` for use by Playwright tests.
 *
 * This component is rendered unconditionally in development. In production
 * builds (NODE_ENV=production) it is a no-op so no test infrastructure ships.
 *
 * Usage in tests:
 *   import fixture from '../e2e/fixtures/seed.json'
 *   await page.evaluate((f) => window.__seed(f), fixture)
 */

import { useEffect } from 'react'
import { seedFromFixture, type E2EFixture } from '../lib/db/schema'

declare global {
  interface Window {
    __seed?: (fixture: E2EFixture) => Promise<void>
  }
}

export function E2ESeed() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    window.__seed = (fixture: E2EFixture) => seedFromFixture(fixture)
    return () => { delete window.__seed }
  }, [])

  return null
}
