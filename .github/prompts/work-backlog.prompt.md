---
agent: 'agent'
description: 'Work through the prioritised backlog one story at a time until complete'
---

Read [.github/stories/backlog.md](.github/stories/backlog.md) to find the highest-priority story that is not yet marked complete (i.e. does not have ✅ in the priority column or rationale).

Then read the corresponding story file from `.github/stories/` in full.

Tell the user which story you are about to work on and ask for confirmation before proceeding. If the user wants to skip it or work on a different story, respect that choice.

---

## Implementation loop

Work through the following steps in order. Do not skip steps.

### 1. Understand the story

- Re-read the story file and list the acceptance criteria
- Identify all files that will need to be created or modified
- If anything is ambiguous or the acceptance criteria conflict with the existing code, **stop and ask the user** before writing any code

### 2. Implement

- Make all necessary code changes following the conventions in [copilot-instructions.md](../copilot-instructions.md)
- Stay strictly in scope — do not fix unrelated issues or add unrequested features
- Match existing code style exactly: indentation, naming, file structure
- Add or update types in `lib/strava/types.ts` if new shared types are needed
- Keep the data layer in SI units (metres, m/s, seconds, s/km); convert only in components

### 3. Run tests

- Run `pnpm test` and confirm all existing tests pass
- If the story touches pure logic in `lib/`, write new Vitest unit tests for the changed behaviour
- Fix any test failures before proceeding — do not move on with a broken test suite

### 4. Verify acceptance criteria

For each acceptance criterion in the story:

- **If it is UI-observable** (GIVEN/WHEN/THEN format): use the Playwright MCP server to verify it against the running dev server. If the dev server is not running, start it with `pnpm dev` first.
- **If it is a pure logic criterion**: confirm it is covered by a passing Vitest test.

If any criterion fails, fix the implementation and re-verify before continuing.

### 5. Mark complete

Once every acceptance criterion is verified:

- Add `✅` to the story's row priority column in `backlog.md`
- Add a `## Completed` section to the bottom of the story file with today's date and a one-line summary of what was done

### 6. Ask whether to continue

Tell the user the story is complete, show the summary, then ask:
> The next item in the backlog is **[next story title]**. Shall I continue with that, or stop here?

Only proceed to the next story if the user confirms.

---

## Rules

- Never mark a story complete unless every acceptance criterion is verified
- If a criterion cannot be verified (e.g. requires data that isn't in the DB), flag this explicitly and ask the user how to proceed
- Do not modify story files other than the one currently being worked on
- Do not alter `backlog.md` except to mark the current story complete
- If the implementation reveals that another story needs to be done first, stop, explain the dependency, and ask the user how to proceed
