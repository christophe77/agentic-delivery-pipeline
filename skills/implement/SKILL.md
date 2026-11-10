---
name: implement
description: Implements a Monday ticket end to end - branch, code, tests, lint, build, commit, push and opening the PR linked to the ticket - following the package commands declared in .agentic/pipeline.yml. Updates the Monday status.
argument-hint: "<Monday ticket item ID>"
---

# Implement a ticket

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` = ID of the Monday ticket item.

## 0. Repo or workspace mode

Look for `.agentic/workspace.yml` in the current folder, then in parent folders. If it exists, you are in **workspace mode**: read `${CLAUDE_PLUGIN_ROOT}/docs/workspace.md` and apply its rules:
- affected repos = the ticket's `Repo(s)` field;
- check `git status` in each one; if there is uncommitted work, stop and ask;
- **same branch** in each repo, created from its `base_branch`;
- work in `order` (the repo that owns a contract first);
- in each repo, read its `CLAUDE.md` and run the commands from its `pipeline.yml`;
- one PR per repo, with a "Linked PRs" section, all listed in the Monday update.

## 1. Prepare

- Read `.agentic/pipeline.yml` and `CLAUDE.md` (in workspace mode: those at the root and in each affected repo).
- Read the ticket, its updates and its parent epic (Monday MCP). If acceptance criteria are missing or ambiguous, stop and ask.
- Check that the ticket's dependencies are done.
- Move the ticket to status `statuses.in_progress`.
- Branch: `git.branch_pattern` (default `{type}/{item_id}-{slug}`) from an up-to-date `git.base_branch`. Work in a worktree if the session allows it.

## 2. Code

- Plan briefly (files, order), then implement in small steps.
- Tests first when reasonable: one test per acceptance criterion.
- Follow the conventions observed in nearby code rather than general preferences.
- For each affected package, run its `commands.lint`, `commands.test`, `commands.build` commands (in `path`). Everything must pass before continuing. Never disable a test or a lint rule to make it pass.
- No plaintext secrets: environment variables, `.env.example` with dummy values, .NET user-secrets.

## 3. Deliver

- Conventional commits: `feat(api): ... ` with the footer `Monday: #<item_id>`.
- Push the branch.
- PR to `git.base_branch` with `gh pr create`, body:

```
## Ticket
Monday #<id>: <title> (<link>)
## Changes
## Acceptance criteria
- [x] ... (with the test that covers it)
## Test plan
## QA scenarios
## Risks / migration / rollback
## Linked PRs (workspace mode)
- my-org/firmware#12 (merge before this one)
```

- Move the ticket to `statuses.review` and post the PR link as a Monday update.

## 4. Self-review

Before handing back, run `/agentic:review` on the PR locally and fix the confirmed findings.
