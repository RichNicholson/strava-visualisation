## Re-sync and clear data options

**As an** athlete  
**I want** the option to re-sync all data from Strava or clear my local data entirely  
**So that** I can fix sync issues or start fresh without clearing my entire browser

### Acceptance criteria

- [ ] `GIVEN` I open the settings panel `WHEN` I view the options `THEN` I see a "Re-sync all" button and a "Clear data" button
- [ ] `GIVEN` I click "Re-sync all" `WHEN` the sync runs `THEN` all activities are re-fetched from Strava, replacing existing data in Dexie
- [ ] `GIVEN` I click "Clear data" `WHEN` I confirm the action `THEN` all Dexie tables (activities, streams, athlete) are cleared and I am redirected to the landing page
- [ ] `GIVEN` I click "Clear data" `WHEN` a confirmation dialog appears `THEN` I must explicitly confirm before data is deleted (no accidental wipes)
- [ ] `GIVEN` a re-sync is in progress `WHEN` I view the dashboard `THEN` the existing sync progress indicator reflects the re-sync status

### Implementation notes

- Relevant files: `app/dashboard/SettingsPanel.tsx` (add buttons), `lib/db/schema.ts` (add a `clearAll()` helper), `hooks/useStravaSync.ts` (add a `fullResync` option that ignores `last_synced`), `lib/db/sync.ts`
- Re-sync should reset `athlete.last_synced` to null before starting, causing the sync to fetch everything
- Clear data should call `db.delete()` or clear each table, then redirect to `/`

## Completed

**2026-03-08** — Added "Re-sync all" and "Clear data" buttons to SettingsPanel with inline confirmation flow; added `clearAll()` helper to `lib/db/schema.ts`; wired `onFullResync` prop through to `startSync(true)` in the dashboard.
