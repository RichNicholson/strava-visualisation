---
agent: 'agent'
description: 'Read all user stories and produce a prioritised backlog with rationale'
---

Read every file in `.github/stories/` in full. Also read [todo.md](../todo.md) and [copilot-instructions.md](../copilot-instructions.md) for context about the project and any priorities already expressed there.

Then ask the user the following questions before proceeding — wait for answers to all of them:

1. **Goal**: What is the primary focus right now? (e.g. "getting the app usable for race analysis", "improving data quality", "adding new visualisations", "technical debt / cleanup")
2. **Constraints**: Are there any stories that must be done first, or any that are blocked or out of scope right now?
3. **Effort preference**: Should quick wins be prioritised over high-value but complex work, or do you want the highest-value item first regardless of effort?

Once you have the answers, produce a **prioritised backlog** as a markdown table saved to `.github/stories/backlog.md`:

| Priority | Story file | Title | Value | Effort | Rationale |
|----------|------------|-------|-------|--------|-----------|
| 1 | US4-Series-Add-Age-Grade.md | Add age grade to series plot | High | Medium | Directly supports race analysis goal; builds on existing WMA lib |
| ... | | | | | |

**Value** and **Effort** should each be rated: `Low` / `Medium` / `High`

Scoring guidance:
- **Value**: How directly does this story serve the user's stated goal? Does it unblock other stories? Would the app be meaningfully better without it?
- **Effort**: Estimate based on number of files likely touched, complexity of logic, and whether new dependencies are needed. Use the architecture in [copilot-instructions.md](../copilot-instructions.md) to inform this.

Rules:
- Do not reorder stories arbitrarily — every position must have a rationale tied to the user's stated goal and constraints
- Stories the user flagged as blocked or out of scope should appear at the bottom, marked with `⛔ Blocked` or `⏸ Out of scope` in the Rationale column
- If two stories are tightly coupled (one enables the other), note this in the rationale and keep them adjacent
- After the table, add a short **Notes** section (3–5 bullet points) calling out any dependencies, risks, or sequencing concerns worth flagging
