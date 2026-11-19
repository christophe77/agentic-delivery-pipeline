---
name: qa
description: Functional QA in a real browser (Playwright MCP in CI, Playwright or Claude in Chrome locally) - runs the acceptance criteria and QA scenarios of a ticket or PR on dev (PR), staging, or as a read-only smoke check on production, captures evidence and errors, and publishes the report on the PR and in Monday.
argument-hint: "[dev | staging | production | <url>] [Monday ticket ID | PR number]"
---

# Browser QA

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` = environment (`dev`, `staging` - default, `production`) or target URL, plus a Monday ticket or a PR. The URL comes from `qa.<environment>_url`.

| Environment | When | Scope | Report on | Monday |
|---|---|---|---|---|
| `dev` | on every PR to `git.base_branch`, next to the code review | the PR's ticket scenarios + `qa.scenarios_dir` | the PR | update only |
| `staging` | after a push to `git.base_branch` (merged PRs) | tickets of the merged PRs + `qa.scenarios_dir` | each merged PR | `statuses.qa_passed` or back to `statuses.in_progress` |
| `production` | after a production deploy (push to `git.production_branch`) | **read-only smoke**: `qa.production_scenarios_dir` + non-mutating checks of the delivered tickets | the promotion PR | update only; a FAIL is an incident, alert the team |

## 0. Workspace mode

If `.agentic/workspace.yml` exists (current folder or parents), first check that **all** the ticket's repos are deployed to the target environment (deployment runs of each repo): otherwise, report what is missing and stop. The report is posted on each PR of the ticket.

## 1. Scenarios

Sources, in this order:
1. "QA scenarios" section and acceptance criteria of the ticket or PR;
2. Files `qa.scenarios_dir/*.md` (permanent regression flows: login, critical path...);
3. If nothing exists, infer 3 to 5 flows from the diff and say so in the report.

Test credentials come from the environment variables listed in `qa.credentials_env` (e.g. `QA_USER_EMAIL`, `QA_USER_PASSWORD`), never from the repo, and are specific to each GitHub environment. Use only test accounts. In production, run **only** read-only checks: no creation, edit, deletion, payment or message; pass "production smoke" to the `qa-tester` subagent and skip (and report) any mutating step.

## 2. Execute

Delegate to the `qa-tester` subagent, one scenario at a time:
- navigate, act, check the expected result;
- screenshot at each check;
- record console errors and failed network requests (4xx/5xx);
- also test mobile width (375 px) for UI flows.

## 3. Report

```
## QA <ticket/PR> on <environment> (<url>): PASS | FAIL
| Scenario | Result | Evidence | Notes |
Console / network errors:
Limitations (not tested, missing data):
```

- PR: comment with the report (`gh pr comment`).
- Monday: update on the ticket; on staging only, status `statuses.qa_passed` if everything passes, otherwise back to `statuses.in_progress` with the failures.
- Save the report and screenshots in `.agentic/runs/<date>-qa/` (ignored by git); in CI, they are published as an artifact.
