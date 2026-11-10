# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

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
