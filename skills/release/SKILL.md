---
name: release
description: Prepares or closes a production release - lists the PRs and Monday tickets delivered since the last release, writes the release notes, triggers the deployment workflow and, after success, moves the tickets to Done. Never bypasses the production environment approval.
argument-hint: "[prepare | close] [version]"
---

# Release

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Input: `$ARGUMENTS` = `prepare` (default) or `close`, and an optional version.

## Workspace mode

If `.agentic/workspace.yml` exists (current folder or parents), the release is **coordinated**: run `prepare` for each repo in `repos` (except `ci: false`), group the shared Monday tickets, and propose deployment in `order`, one repo after another, waiting for the previous one to succeed. Release notes are per repo, with a shared product summary.

## prepare

1. Last release: `gh release list --limit 1` or the latest tag.
2. PRs merged since then: `gh pr list --state merged --base <base> --search "merged:>=<date>"`.
3. Associated Monday tickets (`Monday: #id` footer or branch name); check that they are at status `statuses.qa_passed`. Flag any ticket not validated in QA.
4. Grouped release notes (New features, Fixes, Technical), in user-facing language, with the Monday links.
5. Show the notes and the ticket list. After an explicit yes, trigger the deployment:
   `gh workflow run agentic-deploy.yml -f environment=production -f version=<version>`
6. Remind the user that the GitHub `production` environment waits for a reviewer's approval: this is intended, do not try to bypass it.

## close

After a successful production deployment (`gh run list --workflow agentic-deploy.yml`):
- delivered tickets to status `statuses.done`, Monday update with the version and the run link;
- epic to `statuses.done` if all its tickets are;
- publish the notes in the GitHub release if it exists.
