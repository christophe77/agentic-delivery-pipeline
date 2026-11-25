---
name: release
description: Prepares or closes a release - lists the PRs and Monday tickets not yet promoted, writes the release notes, opens the promotion PR (develop -> staging, or staging -> main) whose merge deploys to the next environment and, after a green production QA, moves the tickets to Done. Never bypasses the production environment approval.
argument-hint: "[prepare [staging | production] | close] [version]"
---

# Release

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` = `prepare` (default) or `close`, an optional target (`staging` or `production`, default `production`), and an optional version.

## Branches

From `.agentic/pipeline.yml` (or the repo entry in `workspace.yml`):
- `<dev>` = `git.base_branch`: target of the feature PRs;
- `<staging>` = `git.staging_branch` (defaults to `git.base_branch`);
- `<prod>` = `git.production_branch` (default `main`).

Two models are supported:
- **two branches** (`<dev>` = `<staging>`, e.g. `staging` / `main`): a single promotion, `staging` → `main`;
- **three branches** (`<dev>` ≠ `<staging>`, e.g. `develop` / `staging` / `main`): two promotions, `prepare staging` (`develop` → `staging`) then `prepare production` (`staging` → `main`).

A promotion goes from `<from>` to `<to>`: `prepare staging` = `<dev>` → `<staging>`, `prepare production` = `<staging>` → `<prod>`. In the two-branch model, `prepare staging` has nothing to do: say so.

## Workspace mode

If `.agentic/workspace.yml` exists (current folder or parents), the release is **coordinated**: run `prepare` for each repo in `repos` (except `ci: false`), group the shared Monday tickets, and propose merging the promotion PRs in `order`, one repo after another, waiting for the previous deploy and QA to succeed. Release notes are per repo, with a shared product summary.

## prepare

1. `git fetch`, then what is on `<from>` and not on `<to>`: `git log --oneline origin/<to>..origin/<from>`. Nothing → stop.
2. PRs merged into `<from>` in that range (`gh pr list --state merged --base <from>` matched against the commits above; in the three-branch model, for `prepare production`, follow the promotion PRs back to the feature PRs).
3. Associated Monday tickets (`Monday: #id` footer or branch name). For `prepare production`, check that they are at status `statuses.qa_passed` (QA passed on staging); flag any ticket not validated.
4. Check that the last QA on the head of `<from>` is green: the QA run of the environment `<from>` deploys to (dev for `<dev>`, staging for `<staging>`), in the toolkit deploy workflow or in the `agentic-qa` job of the project's own deploy workflow (`gh run list --branch <from>` / `gh run list --event pull_request`, then `gh run view`). Otherwise, say so and stop.
5. Grouped release notes (New features, Fixes, Technical), in user-facing language, with the Monday links.
6. Show the notes and the ticket list. After an explicit yes, open (or update) the **promotion PR**:
   `gh pr create --base <to> --head <from> --title "release(<target>): <version>" --body <notes>`
7. Tell the user the next human steps: merge the promotion PR (a merge commit, not a squash, so the branches stay aligned); for production, approve the GitHub `production` environment if it has required reviewers. The deploy then triggers the QA of that environment (read-only smoke checks in production). Never merge it yourself and never try to bypass an approval.

## close

After a successful production deployment **and a green production QA** (`gh run list --branch <prod>` or the `agentic-qa` job of the deploy run of the promotion PR). If the production QA failed, do not close: report the failures on the promotion PR and in Monday, and suggest a fix (new ticket) or a rollback (redeploy the previous production commit). If it is BLOCKED (smoke checks could not run: account, data, environment), do not close either: report the "To unblock" list and re-run the QA once it is fixed.
- delivered tickets to status `statuses.done`, Monday update with the version and the run link;
- epic to `statuses.done` if all its tickets are;
- publish the notes in the GitHub release if it exists.
