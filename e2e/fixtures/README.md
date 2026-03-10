# E2E Test Fixtures

## Generating the fixture

1. Make sure the app is running locally (`pnpm dev`)
2. Open the dashboard and sync your Strava data if not already done
3. Add the runs you want available as streams to the **Roster** (these are the ones the series plot will use in tests)
4. Open **Settings** (gear icon in the top bar)
5. Click **"Export test fixture (N streams)"**
6. Save the downloaded file as `e2e/fixtures/seed.json` in this directory

The fixture contains:
- All your activities (every run, ride, etc. in your local DB)
- Streams (GPS, HR, pace time-series) only for the runs in your roster at export time
- Your athlete profile (date of birth, sex — needed for age-grade tests)

## Refreshing the fixture

Re-export and overwrite `seed.json` whenever you want to:
- Pick up newly synced activities
- Change which runs have stream data available in tests
- Add a specific problematic activity for a regression test

## What the fixture contains

Each activity has its Strava ID (the `id` field), matching the URL pattern:
`https://www.strava.com/activities/{id}`

This means any failing test can be cross-referenced directly on Strava.

## Privacy note

`seed.json` contains your actual activity data. It is listed in `.gitignore` and
should **never be committed** to the repository.
