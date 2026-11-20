# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.3.6] - 2026-11-20

### Fixed
- CI review: sibling context repos were always cloned on their default branch. The branch lookup (`git ls-remote`) ran inside the checkout, where the auth header set by `actions/checkout` (the calling repo's token) overrides the token in the URL, so the lookup always failed. It now runs outside the checkout. On kadeya-portal #650, the backend was read on `main` instead of `develop`, and the review could not check SJ-BE-3.

## [0.3.5] - 2026-11-20

### Fixed
- QA login in CI: the prompt asked to read `process.env` from Playwright MCP code, which has no `process` in its sandbox. On kadeya-portal #649 the QA could not log in and failed. It now types the secret **names** with `browser_type`: Playwright MCP, started with `--secrets`, substitutes the real values and masks them in its responses.
- CI review and QA: subagents run in the foreground (`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` and an explicit instruction). On kadeya-portal #650 and #651, Claude launched the `reviewer` and `security-reviewer` subagents in the background, wrote "waiting for the subagents" and ended its turn: the one-shot session stopped there and nothing was posted, after about $1 of tokens each.
- CI review: sibling context repos are cloned on the PR branch, then on the PR **base** branch (e.g. `develop`), then on the default branch. Before, a backend without the same branch was read on `main`, which missed changes already on `develop`.

## [0.3.4] - 2026-11-20

### Fixed
- CI review: a run could end green without posting anything (kadeya-portal #650 and #651: 13 to 17 turns, no comment). The prompt now states that the run is non-interactive, that a missing ticket or criteria goes in the summary, and that the summary comment is always posted.
- CI review: a "Review posted" step fails the job when Claude posted no comment, instead of a silent green run.
- CI review: the PR's Monday ticket (Monday URL, `Monday #id` or `MON-id` in the description, or an ID in the branch name) is fetched by a shell step before Claude starts, into `.agentic/runs/monday-ticket.md`, and read first. New optional secret `MONDAY_API_TOKEN` for `claude-review.yml`: the token never reaches the agent and no tokens are spent looking for the ticket.
- CI review: Claude's transcript (`execution_file`, hidden by the action) is uploaded as the `claude-review-transcript` artifact, kept 7 days.

## [0.3.3] - 2026-11-20

### Changed
- QA on dev and staging runs the mutating steps of the scenarios end to end (create, edit, submit, adjust, refund) with the test account and the payment provider's test mode, and checks their result. On kadeya-portal PR #647 the dev QA skipped the wallet adjustment and refund submissions to avoid mutating dev data. Only steps that reach real people or real money are skipped, and reported. Production stays read-only.

## [0.3.2] - 2026-11-20

### Changed
- **CI review on Claude Opus 5.5 by default** (`model` input of `claude-review.yml`, `max-turns` 40 → 60). On kadeya-portal PR #647, the review on the action's default model found nothing where a local Opus review found 4 minor issues and 2 security notes. Set `model: claude-sonnet-5-5` in the caller to halve the cost.
- `qa.yml` gets a `model` input (default `claude-sonnet-5-5`, unchanged behavior).
- `review` skill: severity scale (blocker, major, minor, note), minor findings reported instead of dropped by verification, explicit edge-case checklist (timeouts and unknown outcomes, idempotency, stale state, limits, malformed data).
- `reviewer` and `security-reviewer` subagents: `model: inherit`, so they run on the review model.

## [0.3.1] - 2026-11-19

### Fixed
- QA: skipped with a warning (not failed) when the deployed commit has no `.agentic/pipeline.yml`, e.g. on `main` before the first promotion.
- QA: explicit verdict when Claude did not run (claude-code-action workflow validation: the workflow file must be identical on the default branch) or when setup failed, instead of "No QA report".
- QA: Playwright and Monday MCP servers pre-installed and `MCP_TIMEOUT` raised to 120 s, so the Monday server no longer times out at startup.
- QA: screenshots and evidence saved under `.agentic/runs/qa/` in CI, the folder published as the run artifact.
- QA: test credentials passed to Playwright MCP with `--secrets` (masked in its responses); login forms are filled from `process.env`, never typed by the model.
- Guard hook: no false positive on `process.env` (only real `.env` files are blocked) nor on a protected branch name that appears after `git push` in another command of the same line (e.g. `gh pr create --base main`).

## [0.3.0] - 2026-11-19

### Added
- **Three-branch model** `develop` → `staging` → `main` (`git.staging_branch`): `/agentic:release prepare staging` and `prepare production` open the two promotion PRs.
- **QA after an existing deploy workflow**: `templates/workflows/agentic-qa-job.yml`, a job to append to the project's own deploy workflow; `qa.yml` gets `github-environment` (e.g. `development`) and `commit` inputs.
- Guard hook also blocks direct pushes to `develop`.

### Changed
- **Branch model staging -> main**: feature PRs target `staging` (push deploys to staging), `main` is fed by a promotion PR opened by `/agentic:release prepare` (push deploys to production after approval).
- Guard hook also blocks direct pushes to `staging`.

### Added
- **QA on dev for every pull request**: the review workflow deploys the PR to a `dev` environment and runs browser QA there, in parallel with the AI review.
- **Production smoke QA** after each production deploy: read-only scenarios from `qa.production_scenarios_dir`; `/agentic:release close` waits for it to be green.
- `environment` input on the QA workflow; `qa.dev_url`, `qa.production_url`, `git.production_branch` in `pipeline.yml`; `dev` accepted by the deploy workflow and the OIDC role template.

## [0.2.0] - 2026-11-10

### Added
- **Workspace mode**: work full-stack across several repos of one product from a single Claude Code session (`.agentic/workspace.yml`), with cross-repo contracts, delivery order, same-branch linked pull requests and coordinated releases.
- `context-repos` input and `CONTEXT_REPOS_TOKEN` secret in the review workflow, to clone sibling repos read-only during CI review.
- C++ (CMake, vcpkg) detection in `pipeline-init`; existing release workflows are kept as is.
- English documentation (French kept in `README.fr.md` and `docs/fr/`), FAQ, `llms.txt`, `SECURITY.md`, `CITATION.cff`.

### Changed
- Skills, subagents, workflows and templates are now written in English; skills reply in the user's language.

## [0.1.0] - 2026-11-10

### Added
- Claude Code plugin with skills `pipeline-init`, `epic`, `tickets`, `implement`, `review`, `qa`, `release` and subagents `planner`, `reviewer`, `security-reviewer`, `qa-tester`.
- PreToolUse guard hook blocking secret access, credential writes, environment dumps, pushes to `main`, force pushes and manual production deploys.
- Reusable GitHub Actions workflows: CI matrix per package, gitleaks secret scan, Claude review, Playwright browser QA, deploy (AWS ECS, GitHub Releases, custom command) with OIDC.
- Templates for NestJS, .NET and monorepo projects, caller workflows, `CLAUDE.md` section and QA scenario.
- CloudFormation template for the GitHub OIDC role and a minimal ECS deploy policy.
