---
agent: 'agent'
description: 'Read todo.md and generate actionable user stories ready for AI implementation'
---

Read the file [todo.md](../todo.md) in full.

Before generating any stories, check the existing files in `.github/stories/` to determine the highest existing story ID (e.g. `US3-...` → highest is 3). New stories must continue the sequence from there. If no stories exist yet, start at `US1`.

For each item in that file, produce a well-structured user story and **save it as an individual file** under `.github/stories/` using this naming format:

```
US{id}-{Area}-{Brief description}.md
```

- `{id}` — unique integer, incrementing from the last existing story
- `{Area}` — the functional area of the app (e.g. `Filter`, `Scatter`, `Series`, `Map`, `Table`, `Sync`, `Auth`, `Roster`)
- `{Brief description}` — 2–5 words in title case, spaces replaced with hyphens (e.g. `Add-Age-Grade`)

Example filename: `US4-Series-Add-Age-Grade.md`

Each file should contain only the story for that item, using this template:

---

## [Short title]

**As a** [user / athlete / visitor]  
**I want** [what they want to do]  
**So that** [the value or outcome]

### Acceptance criteria

- [ ] [Observable, testable condition 1]
- [ ] [Observable, testable condition 2]
- [ ] ...

### Implementation notes

- Relevant files: [list the most likely files to create or modify based on the codebase architecture]
- Any constraints or conventions from [copilot-instructions.md](../copilot-instructions.md) that apply

---

After saving all files, output a summary table listing each filename and its one-line title.

Rules for producing good stories:

- Write criteria that are **specific and verifiable** — avoid vague words like "works correctly" or "looks good"
- Each criterion should describe a single observable behaviour
- Keep implementation notes brief — point at files and conventions, do not write code
- If a todo item is too vague to turn into a story, **stop and ask the user** specific questions to clarify intent before producing the story — do not guess or produce a placeholder
- Group related todo items into a single story if they clearly belong together
- Use the existing architecture (`lib/analysis/`, `hooks/`, `components/`, etc.) to inform which files are relevant
- Respect the unit conventions from the project: distances in metres, speeds in m/s, times in seconds, pace in s/km — call this out in acceptance criteria where relevant

### Acceptance criteria style — Playwright

The Playwright MCP server is available, so acceptance criteria should be written as **browser-observable steps** wherever the story involves UI behaviour. Use this format for those criteria:

- [ ] `GIVEN` [precondition] `WHEN` [user action] `THEN` [observable DOM/visual outcome]

Examples of good Playwright-testable criteria:
- [ ] `GIVEN` activities are synced `WHEN` the distance slider is moved to 10 km `THEN` the activity table shows only rows where distance ≥ 10 km
- [ ] `GIVEN` the dashboard loads `WHEN` no filter is applied `THEN` the scatter plot contains at least one data point

For purely computational stories (e.g. changes to `lib/analysis/`) where there is no UI interaction, plain `- [ ]` criteria without the Given/When/Then format are fine.
