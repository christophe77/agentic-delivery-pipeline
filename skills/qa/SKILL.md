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
| `dev` | after a deploy to dev: the open PR (two-branch model) or the PR merged into `git.base_branch` (three-branch model) | the PR's ticket scenarios + `qa.scenarios_dir` | the PR | update only |
| `staging` | after a deploy to staging (merge into `git.staging_branch`) | tickets of the PRs included + `qa.scenarios_dir` | each included PR, or the promotion PR | `statuses.qa_passed` or back to `statuses.in_progress` |
| `production` | after a production deploy (merge into `git.production_branch`) | **read-only smoke**: `qa.production_scenarios_dir` + non-mutating checks of the delivered tickets | the promotion PR | update only; a FAIL is an incident, alert the team |

In CI, the QA runs either from the toolkit deploy template or from an `agentic-qa` job added at the end of the project's own deploy workflow.

## 0. Workspace mode

If `.agentic/workspace.yml` exists (current folder or parents), first check that **all** the ticket's repos are deployed to the target environment (deployment runs of each repo): otherwise, report what is missing and stop. The report is posted on each PR of the ticket.

## 1. Scenarios

Sources, in this order:
1. "QA scenarios" section and acceptance criteria of the ticket or PR;
2. Files `qa.scenarios_dir/*.md` (permanent regression flows: login, critical path...);
3. If nothing exists, infer 3 to 5 flows from the diff and say so in the report.

Test credentials come from the environment variables listed in `qa.credentials_env` (e.g. `QA_USER_EMAIL`, `QA_USER_PASSWORD`), never from the repo, and are specific to each GitHub environment. Never type or print their values. With Playwright MCP started with `--secrets` (CI), call `browser_type` with the secret **name** (`QA_USER_EMAIL`, `QA_USER_PASSWORD`): it types the real value and masks it in its responses. Locally, use Playwright code that reads `process.env`. Use only test accounts. On dev and staging, run the mutating steps of the scenarios end to end (create, edit, submit, adjust, refund) and check their result: not mutating test data is not a valid reason to skip a scenario; skip only what would reach real people or real money, and report it. In production, run **only** read-only checks: no creation, edit, deletion, payment or message; pass "production smoke" to the `qa-tester` subagent and skip (and report) any mutating step.

## 2. Execute

Delegate to the `qa-tester` subagent, one scenario at a time, in the foreground (in CI, a background subagent never reports back once you end your turn):
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
- Monday: update on the ticket. Status:
  - when the QA starts, `statuses.qa_<environment>` if the board defines it (e.g. `qa_dev: Dev QA`, `qa_staging: STG QA`, `qa_production: Prod QA`);
  - on failure, `statuses.qa_failed` if defined, otherwise back to `statuses.in_progress`, with the failures;
  - on success on staging, `statuses.qa_passed`; on dev and production, leave the status for the next step.
- Save the report and screenshots in `.agentic/runs/<date>-qa/` locally, and in `.agentic/runs/qa/` in CI (the only folder published as the run artifact). Both are ignored by git.
