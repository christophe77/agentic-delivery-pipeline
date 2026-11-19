---
name: release
description: Prepares or closes a production release - lists the PRs and Monday tickets on staging not yet in production, writes the release notes, opens the promotion PR staging -> main whose merge deploys to production and, after a green production QA, moves the tickets to Done. Never bypasses the production environment approval.
argument-hint: "[prepare | close] [version]"
---

# Release

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` = `prepare` (default) or `close`, and an optional version.

## Workspace mode

If `.agentic/workspace.yml` exists (current folder or parents), the release is **coordinated**: run `prepare` for each repo in `repos` (except `ci: false`), group the shared Monday tickets, and propose merging the promotion PRs in `order`, one repo after another, waiting for the previous production deploy and QA to succeed. Release notes are per repo, with a shared product summary.

## prepare

Branches: `<base>` = `git.base_branch` (default `staging`), `<prod>` = `git.production_branch` (default `main`).

1. `git fetch`, then what is on staging and not in production: `git log --oneline origin/<prod>..origin/<base>`. Nothing → stop.
2. PRs merged into `<base>` in that range (`gh pr list --state merged --base <base>` matched against the commits above).
3. Associated Monday tickets (`Monday: #id` footer or branch name); check that they are at status `statuses.qa_passed`. Flag any ticket not validated in QA.
4. Grouped release notes (New features, Fixes, Technical), in user-facing language, with the Monday links.
5. Check that the last staging QA run on the head of `<base>` is green (`gh run list --workflow agentic-deploy.yml --branch <base>`). Otherwise, say so and stop.
6. Show the notes and the ticket list. After an explicit yes, open (or update) the **promotion PR**:
   `gh pr create --base <prod> --head <base> --title "release: <version>" --body <notes>`
7. Tell the user the next human steps: merge the promotion PR (a merge commit, not a squash, so `<base>` and `<prod>` stay aligned), then approve the GitHub `production` environment. The deploy workflow then runs the read-only production QA. Never merge it yourself and never try to bypass the approval.

## close

After a successful production deployment **and a green production QA** (jobs `production` and `qa-production` in `gh run list --workflow agentic-deploy.yml --branch <prod>`). If the production QA failed, do not close: report the failures on the promotion PR and in Monday, and suggest a fix (new ticket) or a rollback (re-run the deploy of the previous production commit).
- delivered tickets to status `statuses.done`, Monday update with the version and the run link;
- epic to `statuses.done` if all its tickets are;
- publish the notes in the GitHub release if it exists.
