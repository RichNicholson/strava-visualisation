## Skip landing page when already authenticated

**As an** athlete  
**I want** to be taken directly to the dashboard if I am already connected to Strava  
**So that** I don't see the landing page every time I open the app

### Acceptance criteria

- [ ] `GIVEN` I have previously authenticated and my athlete record exists in Dexie `WHEN` I visit the root URL (`/`) `THEN` I am automatically redirected to `/dashboard`
- [ ] `GIVEN` I have never authenticated `WHEN` I visit the root URL `THEN` I see the landing page with the "Connect with Strava" button
- [ ] `GIVEN` my OAuth token has expired `WHEN` I visit the root URL `THEN` I see the landing page (or an appropriate re-auth prompt)

### Implementation notes

- Relevant files: `app/page.tsx` (add client-side redirect check), `hooks/useActivities.ts` (`useAthlete` can check for an existing record)
- The root page is currently a server component — it may need `'use client'` or a wrapper to access Dexie
- Alternatively, use a small client component that checks auth state and calls `router.push('/dashboard')`
