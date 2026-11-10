---
name: qa
description: Functional QA in a real browser (Playwright MCP in CI, Playwright or Claude in Chrome locally) - runs the acceptance criteria and QA scenarios of a ticket or PR against a staging or preview URL, captures evidence and errors, and publishes the report on the PR and in Monday.
argument-hint: "<url> [Monday ticket ID | PR number]"
---

# Browser QA

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` = target URL (otherwise `qa.staging_url`), plus a Monday ticket or a PR.

## 0. Workspace mode

If `.agentic/workspace.yml` exists (current folder or parents), first check that **all** the ticket's repos are deployed to staging (deployment runs of each repo): otherwise, report what is missing and stop. The report is posted on each PR of the ticket.

## 1. Scenarios

Sources, in this order:
1. "QA scenarios" section and acceptance criteria of the ticket or PR;
2. Files `qa.scenarios_dir/*.md` (permanent regression flows: login, critical path...);
3. If nothing exists, infer 3 to 5 flows from the diff and say so in the report.

Test credentials come from the environment variables listed in `qa.credentials_env` (e.g. `QA_USER_EMAIL`, `QA_USER_PASSWORD`), never from the repo. Use only test accounts and the staging environment; never run QA against production.

## 2. Execute

Delegate to the `qa-tester` subagent, one scenario at a time:
- navigate, act, check the expected result;
- screenshot at each check;
- record console errors and failed network requests (4xx/5xx);
- also test mobile width (375 px) for UI flows.

## 3. Report

```
## QA <ticket/PR> on <url>: PASS | FAIL
| Scenario | Result | Evidence | Notes |
Console / network errors:
Limitations (not tested, missing data):
```

- PR: comment with the report (`gh pr comment`).
- Monday: update on the ticket; status `statuses.qa_passed` if everything passes, otherwise back to `statuses.in_progress` with the failures.
- Save the report and screenshots in `.agentic/runs/<date>-qa/` (ignored by git); in CI, they are published as an artifact.
