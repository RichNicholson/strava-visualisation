## E2E test infrastructure with fixture seeding

**As a** developer  
**I want** Playwright end-to-end tests that run against real activity data from my Strava account  
**So that** UI acceptance criteria can be verified automatically without relying on manual inspection or fabricated test data

### Acceptance criteria

- [ ] Running `pnpm e2e` against a running dev server executes Playwright tests using seeded IndexedDB data
- [ ] The Settings panel contains an "Export test fixture" button that downloads a JSON file containing all activities and streams for the rostered runs
- [ ] The downloaded file includes each activity's Strava ID (the `id` field) so failing tests can be cross-referenced directly on Strava
- [ ] Importing the fixture into a fresh browser context via `window.__seed(fixture)` populates IndexedDB such that the dashboard shows real activities without going through OAuth
- [ ] `window.__seed` is only available in development builds (`NODE_ENV !== 'production'`) — it does not ship in production
- [ ] `e2e/fixtures/seed.json` is listed in `.gitignore` and is never committed
- [ ] `e2e/example.spec.ts` contains working smoke tests that pass once a fixture is generated

### Implementation notes

- New files: `app/E2ESeed.tsx`, `playwright.config.ts`, `e2e/helpers/seed.ts`, `e2e/fixtures/README.md`, `e2e/example.spec.ts`
- Modified files: `lib/db/schema.ts` (add `E2EFixture`, `exportFixture`, `seedFromFixture`), `app/layout.tsx` (render `<E2ESeed />`), `app/dashboard/SettingsPanel.tsx` (export button + `rosterIds` prop), `app/dashboard/page.tsx` (pass `rosterIds`)
- `exportFixture(rosterIds)` queries Dexie directly — no new API routes
- `seedFromFixture(fixture)` calls `clearAll()` first so tests start from a known state

## Completed

2026-03-08 — Implemented full E2E fixture infrastructure: Playwright installed, `exportFixture`/`seedFromFixture` in schema.ts, `E2ESeed` component attaching `window.__seed`, export button in Settings (shows rostered stream count), `playwright.config.ts`, `e2e/helpers/seed.ts`, `e2e/example.spec.ts`, `.gitignore` updated.
