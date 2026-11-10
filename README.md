# Agentic Delivery Pipeline for Claude Code

**From Monday.com epic to production on AWS: an AI-driven software delivery pipeline built on Claude Code, GitHub Actions and AWS OIDC.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)](https://docs.anthropic.com/en/docs/claude-code)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-reusable%20workflows-2088FF)](.github/workflows)
[![Version](https://img.shields.io/badge/version-0.2.0-informational)](CHANGELOG.md)

English | [Français](README.fr.md)

`agentic-delivery-pipeline` is an open-source **Claude Code plugin** plus a set of **reusable GitHub Actions workflows** that automate the whole software development lifecycle (SDLC) with AI agents: writing the epic, splitting it into tickets in Monday.com, implementing each ticket, AI code review on every pull request, browser QA with Playwright on staging, and deployment to AWS or GitHub Releases. Humans keep three decisions: approving the plan, merging, and releasing to production.

It is **stack-agnostic** (Node.js, NestJS, React, C#/.NET, Go, Flutter, Tauri, C++), works on **monorepos** and on **multi-repo workspaces**, and keeps **zero secrets in any repository**.

## Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Supported stacks and deployment targets](#supported-stacks-and-deployment-targets)
- [Quick start](#quick-start)
- [One pipeline per repo or one global pipeline?](#one-pipeline-per-repo-or-one-global-pipeline)
- [Workspace mode: full-stack work across several repos](#workspace-mode-full-stack-work-across-several-repos)
- [Security model](#security-model)
- [FAQ](#faq)
- [Repository layout](#repository-layout)

## How it works

```mermaid
flowchart LR
    A[Need] --> B["/agentic:epic<br/>Epic in Monday"]
    B --> C["/agentic:tickets<br/>Tickets in Monday"]
    C --> D["/agentic:implement<br/>Branch, code, tests, PR"]
    D --> E["AI code review<br/>(CI, every push)"]
    E --> F{{Human merge}}
    F --> G["Deploy staging<br/>AWS / GitHub"]
    G --> H["Browser QA<br/>Playwright (CI)"]
    H --> I{{Human approval}}
    I --> J["Deploy production"]
    J --> K["/agentic:release close<br/>Tickets Done"]
```

| Step | Command or trigger | What the agent does | Human gate |
|---|---|---|---|
| 1. Epic | `/agentic:epic <need>` | Reads the codebase, drafts context, goal, scope, acceptance criteria and risks, creates the epic in Monday | approve the epic |
| 2. Tickets | `/agentic:tickets <epic id>` | Splits into vertical slices with Given/When/Then criteria, dependencies, test plan and QA scenarios | approve the breakdown |
| 3. Implement | `/agentic:implement <ticket id>` | Creates the branch, writes code and tests, runs lint/test/build, opens the PR linked to the ticket | |
| 4. Review | every pull request (CI) | Parallel correctness and security reviewers, inline comments, acceptance-criteria coverage | **merge** |
| 5. Staging | push to `main` | Deploys each package to AWS ECS, GitHub Releases or a custom command, using OIDC | |
| 6. QA | after staging deploy (CI) | Runs the ticket's QA scenarios in a headless browser, posts evidence to the PR and Monday | |
| 7. Production | after green QA | Waits for the GitHub `production` environment approval, then deploys | **approve release** |
| 8. Close | `/agentic:release close` | Moves tickets to Done, writes release notes | |

## Features

- **Claude Code plugin**: 7 skills (`pipeline-init`, `epic`, `tickets`, `implement`, `review`, `qa`, `release`) and 4 subagents (`planner`, `reviewer`, `security-reviewer`, `qa-tester`).
- **Monday.com integration** through the Monday MCP server: epics, tickets, statuses and updates.
- **AI code review in CI** with [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action): inline comments, verified findings only, never approves or merges.
- **Browser QA** with [Playwright MCP](https://github.com/microsoft/playwright-mcp) in CI, or Claude in Chrome locally.
- **Reusable GitHub Actions workflows**: CI matrix per package, secret scanning (gitleaks), review, QA, deploy.
- **AWS deployment without access keys**: GitHub OIDC role (CloudFormation template included) for ECS, S3, CDK or any command.
- **GitHub Releases target** for desktop apps, agents and firmware.
- **Guard hook** that stops the agent from reading secret files, writing credentials, dumping the environment, pushing to `main` or deploying to production by hand.
- **Multi-repo workspace mode** with cross-repo contracts (MQTT topics, APIs) and linked pull requests.

## Supported stacks and deployment targets

| Stack | Detected from | Toolchain set up in CI |
|---|---|---|
| Node.js, NestJS, React, Vite, Next.js | `package.json` | Node + npm / pnpm / yarn |
| Monorepo (Turborepo, pnpm, Nx) | `turbo.json`, `pnpm-workspace.yaml`, `nx.json` | one CI job per package |
| C# / .NET | `*.sln`, `*.csproj` | .NET SDK (Linux or Windows runner) |
| Go | `go.mod` | Go |
| Flutter | `pubspec.yaml` | Flutter |
| Tauri | `src-tauri/` | Node + Rust |
| C++ (CMake, vcpkg) | `CMakeLists.txt` | none, your commands run as declared |

| Deployment target | Use case |
|---|---|
| `aws-ecs` | Docker image to ECR, new task definition, ECS service update |
| `github-release` | desktop apps, Windows services, agents, firmware bundles |
| `command` | AWS CDK, SAM, Terraform, S3 + CloudFront, any script |

## Quick start

**1. Install the plugin** (once per machine):

```bash
claude plugin marketplace add christophe77/agentic-delivery-pipeline
claude plugin install agentic@agentic-delivery
```

**2. Wire a project.** Open Claude Code in the project repo (or in a folder that contains several repos) and run:

```
/agentic:pipeline-init https://<your-space>.monday.com/boards/1234567890
```

It detects the stack, writes `.agentic/pipeline.yml`, adds three thin caller workflows and a `CLAUDE.md` section, then prints the GitHub and AWS settings to configure.

**3. Deliver:**

```
/agentic:epic "Users can export their orders as CSV"
/agentic:tickets <epic id>
/agentic:implement <ticket id>
```

Full setup (GitHub secrets, environments, AWS OIDC role): [docs/installation.md](docs/installation.md).

## One pipeline per repo or one global pipeline?

**Both, in two layers.**

| Layer | Where | Contains | Changes |
|---|---|---|---|
| **Global** (this repo) | versioned with tags `v1`, `v1.2` | plugin (skills, subagents, guard) and reusable workflows | rarely, for every project at once |
| **Per repo** | `.agentic/pipeline.yml`, 3 caller workflows, `CLAUDE.md` section | project facts: stack, commands, packages, Monday board, deploy targets, staging URL | with the project |

The logic (how to review, test and deploy) is written and fixed once. Each repo only declares its facts. A single central pipeline reaching into every repo would need cross-repo permissions and centralized secrets, and one failure would block everyone.

## Workspace mode: full-stack work across several repos

A product often lives in several repos: an app, a backend, an embedded service, a releases repo. Run Claude Code **at the root of a folder that contains them all**, with a `.agentic/workspace.yml` that maps the repos, their **contracts** (MQTT topics, REST APIs, shared schemas) and the **delivery order**.

- Epics and tickets can span several repos, with the context of the whole product.
- `/agentic:implement` creates the same branch in every touched repo and opens one PR per repo, linked together.
- `/agentic:review <ticket>` reviews all the ticket's PRs as one change and checks both sides of every contract. In CI, the review can clone sibling repos read-only.
- Each repo keeps its own CI and deployment.

Details: [docs/workspace.md](docs/workspace.md).

## Security model

- **No secrets in any repo**: API keys live in GitHub Secrets, AWS access uses OIDC (temporary credentials, scoped to one repo and one environment), application secrets stay in AWS Secrets Manager or SSM.
- **Guard hook** (`scripts/guard.mjs`): blocks reading `.env`, keys and credential files, writing anything that looks like an AWS, Anthropic, GitHub, Stripe or Slack credential, `printenv`, `aws configure`, force pushes, pushes to `main` and manual production deploys.
- **gitleaks** on every pull request and push.
- **Human approval** required on the `production` environment.
- **No review on fork PRs**, least-privilege permissions per job.

More: [docs/security.md](docs/security.md) and [SECURITY.md](SECURITY.md).

## FAQ

**What is an agentic delivery pipeline?**
A software delivery pipeline where AI agents do the work between human decisions: they write the epic and tickets, implement, review, test in a browser and deploy, while humans approve the plan, merge and release.

**Does it replace developers?**
No. It removes the mechanical work around each change. A developer still frames the need, approves the breakdown, reviews and merges, and approves production releases.

**Which AI model does it use?**
Claude, through Claude Code locally and `anthropics/claude-code-action` in GitHub Actions. You authenticate with an Anthropic API key or a Claude Code OAuth token stored as a GitHub secret.

**Do I need Monday.com?**
Monday.com is the ticket system supported today, through its MCP server. The pipeline steps that do not touch tickets (CI, review, QA, deploy) work without it.

**Does it work with private repositories and organizations?**
Yes. The toolkit repo is public so any account can call its reusable workflows; your project repos stay private. Secrets are passed explicitly because `secrets: inherit` does not cross accounts.

**Can I use it on a monorepo or on several repos?**
Yes. A monorepo declares several `packages` (one CI job each). Several repos of one product use workspace mode.

**Does the agent ever deploy to production by itself?**
No. Production deploys only run through GitHub Actions after a human approves the `production` environment, and the guard hook blocks manual production deploy commands locally.

**How much does it cost?**
The toolkit is free and MIT licensed. You pay for Claude usage (API or subscription) and your usual GitHub Actions and AWS resources. Each review or QA run has a `max-turns` cap.

## Repository layout

```
.claude-plugin/          plugin manifest and marketplace (one-command install)
skills/                  pipeline-init, epic, tickets, implement, review, qa, release
agents/                  planner, reviewer, security-reviewer, qa-tester
hooks/, scripts/guard.mjs    PreToolUse guard (secrets, production, main branch)
.github/workflows/       reusable workflows: ci, secret-scan, claude-review, qa, deploy
templates/               pipeline.yml (NestJS, .NET, monorepo), workspace.yml, caller workflows, CLAUDE.md, QA scenario
infra/aws/               GitHub OIDC role (CloudFormation) and minimal ECS deploy policy
docs/                    installation, security, workspace mode (English); docs/fr (French)
llms.txt                 summary for AI assistants and search engines
```

## Status

Version 0.2: being validated on real projects. Items still to verify in real conditions are listed in [docs/installation.md](docs/installation.md#to-validate-on-the-first-run). Feedback and issues are welcome.

## Author

Built by [Christophe Bellec](https://github.com/christophe77), full-stack architect (React, Node.js, IoT, AWS) working with AI-assisted development end to end.

## License

[MIT](LICENSE)
