---
name: review
description: Code review of a PR or the current diff - correctness, security, coverage of the Monday ticket's acceptance criteria - with parallel subagents and verification of every finding. Posts inline comments in CI, reports locally.
argument-hint: "[PR number]"
---

# Code review

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` = PR number (otherwise: diff of the current branch against `git.base_branch`).

## 0. Repo or workspace mode

Look for `.agentic/workspace.yml` in the current folder, then in parent folders. In **workspace mode** (see `${CLAUDE_PLUGIN_ROOT}/docs/workspace.md`), the argument can be a Monday ticket ID: find all its PRs (one per repo, same branch) and review them **as a single change**. Also check every affected contract from `contracts`: are both sides consistent (topic names, fields, types, error codes), is the stated compatibility real, is the merge order respected?

In CI, if neighboring repos are cloned into `.agentic-context/`, use them to check the other side of the contracts (read only).

## 1. Gather

- Diff: `gh pr diff <n>` or `git diff <base>...HEAD`. PR description: `gh pr view <n>`.
- Monday ticket: in CI, the workflow has already fetched it into `.agentic/runs/monday-ticket.md` when the PR links one and a `MONDAY_API_TOKEN` is set: read that file first, before any analysis. Otherwise, ID from the PR description (Monday link, `Monday #id`, `MON-id`), the branch name or the `Monday: #id` footer. Read its acceptance criteria (Monday MCP if available; in CI without a Monday token, use the PR's "Acceptance criteria" section).
- `CLAUDE.md` and `.agentic/pipeline.yml` for conventions.

## 2. Analyze in parallel

Launch these subagents in the same message:
- `reviewer`: bugs, edge cases, regressions, error handling, concurrency, obvious performance issues, consistency with nearby code. Push on the cases a diff hides: timeouts and unknown outcomes (a request that may have succeeded), retries and idempotency keys, state that survives a navigation, a user switch or a remount, money and quantity limits, malformed backend data.
- `security-reviewer`: secrets, injections, authz/authn, sensitive data in logs, dependencies, IaC.

Then yourself: is each acceptance criterion implemented **and** tested?

## 3. Verify

For each finding, reread the actual code around the line and discard anything that cannot be demonstrated (a concrete failure scenario is required). No style remarks already covered by the linter.

Verification removes false positives, not small issues: a demonstrable minor finding is reported as **minor**, never dropped. Classify each one: **blocker** (wrong behavior on a main path, data or money at risk, security hole), **major** (wrong behavior on a realistic edge case), **minor** (rare edge case, misleading message, robustness), **note** (product or design question, not a bug of the PR). In CI you cannot run the tests or the build: say so, and reason about them from the code.

## 4. Report

- **In CI** (variable `GITHUB_ACTIONS=true`): nobody can answer a question, so never stop to ask; a missing ticket or criteria goes in the summary. One inline comment per confirmed finding (the action's inline comment tool, or `gh`), then a summary comment: verdict (OK / changes requested), findings by severity, criteria covered / not covered.
- **Locally**: the same summary in the chat, and offer to fix.
- Never approve the PR and never merge: merging stays human.
