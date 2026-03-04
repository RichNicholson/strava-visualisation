# Plan — Resume Strava Visualisation (2026-03-04)

## Where the project is at

A working browser-only Strava dashboard exists: OAuth auth is complete, activity sync to IndexedDB works, and both the scatter plot (with WMA age-grade contours) and multi-activity series plot are implemented. The project is usable but has several known rough edges and one significant planned feature (map/route view) that was never started.

---

## Known incomplete or broken items

From the codebase summary:

1. **No token refresh** — when the access token expires the user gets a silent failure with no prompt to re-authenticate.
2. **`useStreams` dependency array hack** — `activityIds.join(',')` as the dep key means the effect silently skips re-fetching if ids change while the count stays the same.
3. **Leaflet installed but unused** — a map/route view was clearly planned but never started; dead dependency sitting in `package.json`.
4. **No `.env.example`** — three required env vars are undocumented outside the source; any new developer or deployment is blocked.
5. **No test suite** — no framework installed, no tests written.
6. **No Strava API rate-limit handling** — stream fetches can hit rate limits silently.
7. **No nudge to set age/gender** — WMA contours silently don't render if the user hasn't opened Settings, with no in-UI prompt.
8. **WMA age factors are approximated** — sampled at 5-year intervals; not validated against the full 2015 tables.

---

## Prioritised backlog

### Priority 1 — Reliability and correctness (do these first)

**1. Add `.env.example`**
Rationale: Unblocks any new deployment or collaborator immediately. Takes five minutes. No reason to leave this undone.

**2. Fix the `useStreams` dependency array**
Rationale: Correctness bug with an eslint-disable hiding it. Low effort — switch to a stable identity key (e.g. sort+join, or a `useRef` tracking previous ids). Fix it before building on top of it.

**3. Add token expiry detection and re-auth prompt**
Rationale: Silent failures on expired tokens are a bad user experience and the most likely problem a returning user will encounter. The fix is: catch `UNAUTHORIZED` in the sync hook and redirect or surface a "reconnect" button. This does not require a full token refresh flow (Strava short-lived tokens mean a redirect to re-auth is acceptable).

### Priority 2 — UX gaps (meaningful but not blocking)

**4. Add a Settings nudge when WMA contours are inactive**
Rationale: The scatter plot's WMA feature is one of the app's main differentiators. If age/gender aren't set, there's currently no hint. A one-line inline message ("Set your age and sex in Settings to enable age-grade contours") is a small change with high impact.

**5. Add Strava rate-limit handling to stream fetches**
Rationale: As a user accumulates more activities, hitting the rate limit on stream fetches will become increasingly likely. At minimum, detect a 429 response and surface it rather than failing silently.

### Priority 3 — Planned feature: map/route view

**6. Implement a basic map/route view using Leaflet**
Rationale: The dependency is already installed, which signals this was intended. This is the largest item and likely why the developer left off here. Start with a single-activity route overlay on a Leaflet map, using the `latlng` stream. Multi-activity views can follow.

### Priority 4 — Quality

**7. Add a test framework and initial tests**
Rationale: The pure functions in `lib/analysis/` (filter, bestSplit) and `lib/wma/ageGrade.ts` are ideal candidates for unit tests — no browser or DB required. Set up Vitest and cover the core analysis logic. Leave hooks and D3 rendering untested for now.

**8. Validate WMA age-grade factors against the full 2015 tables**
Rationale: Low urgency — the approximation is acknowledged in the code and the error is small. Worth revisiting if the WMA feature becomes a focus.

---

## Suggested first task for this session

**Fix the `.env.example` file, then tackle the token expiry re-auth prompt.**

Start with `.env.example` — it takes under five minutes and closes out a loose end. Then move to the token expiry issue: read `app/api/auth/strava/callback/route.ts` and `hooks/useStravaSync.ts` to confirm exactly where the token arrives and where `UNAUTHORIZED` is caught, then add a "Session expired — reconnect with Strava" button that appears in the dashboard when the sync fails with that error.

These two tasks are self-contained, require no architectural decisions, and leave the project meaningfully better than you found it.

---

## Definition of done (overall)

- All items in Priority 1 and 2 resolved.
- Map/route view shows a route line for a single activity on a Leaflet map.
- Vitest installed with tests covering `applyFilter`, `computeBestSplits`, and `computeAgeGrade`.
- No eslint-disable comments left covering actual bugs.
- `.env.example` present and accurate.
