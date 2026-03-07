## Open run in Strava from roster

**As an** athlete  
**I want** to open a rostered run directly in Strava  
**So that** I can quickly view the full activity details on Strava's website

### Acceptance criteria

- [ ] `GIVEN` runs are in the roster `WHEN` I look at a roster entry `THEN` there is a link/icon to open the activity in Strava
- [ ] `GIVEN` I click the Strava link on a roster entry `WHEN` the link opens `THEN` it navigates to `https://www.strava.com/activities/{id}` in a new tab
- [ ] The link does not interfere with the existing click-to-select behaviour on roster entries

### Implementation notes

- Relevant files: `components/roster/RosterPanel.tsx`
- The activity `id` maps directly to the Strava URL — no API call needed
- Use `target="_blank"` and `rel="noopener noreferrer"` on the link
