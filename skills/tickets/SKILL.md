---
name: tickets
description: Breaks a Monday epic down into deliverable tickets (vertical slices) with Given/When/Then acceptance criteria, affected package, dependencies, test plan and QA scenarios, then creates them in Monday after approval.
argument-hint: "<Monday epic item ID>"
---

# Break an epic down into tickets

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` = ID of the Monday epic item.

## 0. Repo or workspace mode

Look for `.agentic/workspace.yml` in the current folder, then in parent folders. If it exists, you are in **workspace mode**: read `${CLAUDE_PLUGIN_ROOT}/docs/workspace.md`. Each ticket then states `Repo(s)` in addition to packages, and every contract change (`contracts`) is explicit, with its compatibility strategy.

## 1. Understand

- Read `.agentic/pipeline.yml` (repo mode) or `.agentic/workspace.yml` then each repo's `pipeline.yml` (workspace mode), then the epic and its updates via Monday MCP.
- Delegate exploration to the `planner` subagent: it maps the relevant code by package (`packages[].path`), and by repo in workspace mode, then reports files, extension points, existing tests, contracts and risks.

## 2. Break down

Rules:
- **Vertical slices**: each ticket delivers end-to-end testable value; no isolated "build the database" ticket, unless a migration is genuinely a prerequisite.
- One ticket = one reasonable PR (target under 400 lines of diff). Otherwise, split it again.
- In a monorepo, a ticket can touch several packages; list them.
- Order by dependencies; mark what can be done in parallel.

Format of each ticket:

```
## <Imperative title>
Repo(s): firmware, app          (workspace mode only)
Package(s): api, portal
Contract changed: MQTT topics, compatible (optional field)   (if applicable)
Type: feat | fix | chore | refactor
Estimate: XS | S | M | L
Depends on: <title or id>
### Acceptance criteria
- Given ..., when ..., then ...
### Technical notes
(files, endpoints, migrations, flags)
### Test plan
(unit, integration, e2e)
### Browser QA scenarios
(flows for /agentic:qa to run; "none" for pure backend tested through the API)
```

## 3. Human approval

Present the list (titles, estimates, dependencies), then the details. Apply corrections. Nothing goes to Monday before an explicit yes.

## 4. Creation in Monday

- Create the tickets as subitems of the epic (or as items in the `monday.groups.backlog` group linked to the epic, depending on `monday.tickets_as`).
- Status `statuses.todo`, description as an update, estimate / package columns if they exist.
- Return the table `id | title | dependencies` and suggest `/agentic:implement <id>` on the first unblocked ticket.
