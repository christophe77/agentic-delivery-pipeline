# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
