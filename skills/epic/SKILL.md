---
name: epic
description: Writes an epic from a need (free text, file, meeting notes, Monday doc) and creates it in the project's Monday board after approval. First step of the agentic delivery pipeline.
argument-hint: "<need, file or link>"
---

# Create an epic

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` (need as free text, file path, Monday doc or meeting link).

## 0. Repo or workspace mode

Look for `.agentic/workspace.yml` in the current folder, then in parent folders. If it exists, you are in **workspace mode**: read `${CLAUDE_PLUGIN_ROOT}/docs/workspace.md`, take the Monday board from `workspace.yml`, and the epic covers all affected repos ("Technical impact" section organized by repo, affected contracts flagged).

## 1. Context

- Read `.agentic/pipeline.yml` (repo mode) or `.agentic/workspace.yml` (workspace mode) for the Monday board and statuses. If neither exists, suggest `/agentic:pipeline-init` and stop.
- Read `CLAUDE.md` and browse the relevant code (Grep/Glob) to ground the epic in what exists: affected modules, constraints, tech debt.
- If the input is a Monday meeting or doc, read it with the Monday MCP tools.
- Search the board for a similar epic to avoid duplicates.

## 2. Writing

Structure, in the team's language, concise:

```
# <Outcome-oriented title>
## Context and problem
## Measurable goal
## Scope
## Out of scope
## Acceptance criteria (epic level)
- [ ] ...
## Technical impact
(monorepo packages / services / migrations / AWS infra / security)
## Risks and open questions
## Expected breakdown
(5 to 10 lines, detailed later by /agentic:tickets)
```

Do not guess the business domain: list areas of uncertainty under "open questions".

## 3. Human approval (mandatory if `gates.epic_approval: true`)

Show the epic to the user and ask for approval or corrections. Write nothing to Monday before an explicit yes.

## 4. Creation in Monday

- Create the item in the board's `monday.groups.epics` group, with status `statuses.todo`.
- Post the full description as an update on the item (markdown).
- Fill in the known columns from `monday.columns` (type = Epic, priority if given).
- Return the item ID and link, then suggest `/agentic:tickets <id>`.
