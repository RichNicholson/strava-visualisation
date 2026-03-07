## Clear all roster entries

**As an** athlete  
**I want** a button to remove all runs from the roster at once  
**So that** I can quickly start a fresh comparison without removing runs one by one

### Acceptance criteria

- [ ] `GIVEN` the roster has one or more entries `WHEN` I view the roster panel `THEN` a "Clear all" button is visible
- [ ] `GIVEN` I click "Clear all" `WHEN` the action completes `THEN` the roster is empty and all plot views update accordingly
- [ ] `GIVEN` the roster is empty `WHEN` I view the roster panel `THEN` the "Clear all" button is hidden or disabled

### Implementation notes

- Relevant files: `components/roster/RosterPanel.tsx` (add button), `app/dashboard/page.tsx` (add a `clearRoster` handler that resets the `roster` Set and `colorAssignments` Map)
