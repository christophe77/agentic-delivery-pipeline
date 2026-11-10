---
name: pipeline-init
description: Installs the agentic delivery pipeline in the current repo or multi-repo workspace. Detects the stack (Node/NestJS, .NET, Go, Flutter, monorepo), generates .agentic/pipeline.yml, the calling GitHub workflows and the CLAUDE.md section, then lists the GitHub and AWS settings to configure. Use once per repo.
argument-hint: "[Monday board ID]"
---

# Initialize the pipeline in this repo

Reply to the user in their language (the artifacts you create in Monday, PRs and commits follow the team's language set in CLAUDE.md, default English).

Goal: a repo ready to use `/agentic:epic`, `/agentic:tickets`, `/agentic:implement`, `/agentic:review`, `/agentic:qa`, `/agentic:release`, with thin CI/CD workflows that call the toolkit's reusable workflows.

The templates are in `${CLAUDE_PLUGIN_ROOT}/templates/`.

## 0. Repo or workspace?

- The current folder is a git repo: **repo mode**, go to step 1.
- The current folder is not a repo but contains subfolders that are (or already contains `.agentic/workspace.yml`): **workspace mode**. Read `${CLAUDE_PLUGIN_ROOT}/docs/workspace.md`, then:
  1. List the repos found (path, `origin` remote, current branch, default branch, uncommitted work) and their stack. Read their README to write a one-line `role`.
  2. Infer the **contracts** between repos (MQTT topics, schemas, DTOs, generated API clients) by looking for the same identifiers on both sides, and propose an `order` (producer before consumer).
  3. Generate `.agentic/workspace.yml` from `templates/workspace.yml` and a root `CLAUDE.md` from `templates/CLAUDE.workspace.md.template`. If a `CLAUDE.md` already exists at the root, add the section without rewriting the rest.
  4. Suggest (without imposing it) versioning the root as a private meta-repo, with a `.gitignore` that excludes the repo folders.
  5. For each repo without `ci: false`, apply steps 1 to 4 below, copying the workspace `monday` block into its `pipeline.yml` (the repo's CI cannot see the root). Make these changes on a dedicated branch per repo (`chore/agentic-pipeline`) created from its default branch, never on a work-in-progress branch.
  6. Ask the grouped question from step 2 **only once for the whole workspace**.

## 1. Detect the stack

Inspect the root and subfolders (2 levels deep):

| Signal | Stack |
|---|---|
| `turbo.json`, `pnpm-workspace.yaml`, `nx.json`, `workspaces` in package.json | monorepo (one package per app) |
| `package.json` with `@nestjs/core` | node (NestJS) |
| `package.json` (React, Vite, Next...) | node |
| `*.sln`, `*.csproj` | dotnet (note `TargetFramework`, and if `net*-windows`: `runner: windows-latest`) |
| `go.mod` | go |
| `pubspec.yaml` | flutter |
| `Cargo.toml` + `src-tauri/` | tauri (node + rust) |
| `CMakeLists.txt`, `vcpkg.json` | cpp (the CI installs no tooling: the declared commands do everything) |
| `Dockerfile` | candidate for `aws-ecs` deployment |
| an existing `release.yml` or deployment already in place | keep it: no `deploy` block, and mention it in the summary |

Read the existing scripts (`package.json`, `Makefile`, `.github/workflows/*`) to reuse the real install / lint / test / build commands instead of inventing them. Detect the package manager from the lockfile.

## 2. Generate `.agentic/pipeline.yml`

Start from the closest template (`pipeline.nestjs.yml`, `pipeline.dotnet.yml`, `pipeline.monorepo.yml`). A simple repo has **a single package** with `path: .`. A monorepo has one package per deployable or testable app.

Ask the user for what you cannot infer, in a single grouped question:
- Monday board ID (argument `$ARGUMENTS` if provided) and exact labels of the status column;
- deployment target of each package (`aws-ecs`, `github-release`, `command`, or none);
- AWS region, ECS cluster / service / task definition family names;
- staging URL for QA.

Use the Monday MCP tools to read the board (columns and statuses) rather than asking, whenever possible.

**No secrets in this file**: only public identifiers (board ID, resource names, URLs). If the user pastes a token, refuse to write it and give the `gh secret set` command for them to run themselves.

## 3. Copy the calling workflows

Copy `templates/workflows/agentic-*.yml` into `.github/workflows/`. Replace `@v1` with the desired toolkit version. Do not touch existing workflows: flag duplicates (an existing CI) and let the user choose.

## 4. CLAUDE.md

Add (or create) a section from `templates/CLAUDE.md.template`: branch conventions, project commands, definition of "done", security rules. If a CLAUDE.md exists, add the section without rewriting the rest.

Add `.agentic-toolkit/` and `.agentic/runs/` to `.gitignore`.

## 5. Configuration checklist (display it, do not run it)

Display the commands that **the user** runs themselves, with values entered at the prompt:

```bash
gh secret set ANTHROPIC_API_KEY          # or CLAUDE_CODE_OAUTH_TOKEN
gh secret set MONDAY_API_TOKEN           # optional: QA and release update Monday from CI
gh api -X PUT repos/{owner}/{repo}/environments/staging
gh api -X PUT repos/{owner}/{repo}/environments/production   # then add required reviewers in Settings
gh variable set AWS_ROLE_ARN --env staging --body "arn:aws:iam::<account>:role/<staging-role>"
gh variable set AWS_ROLE_ARN --env production --body "arn:aws:iam::<account>:role/<prod-role>"
```

Remind the user about deploying the OIDC role: `docs/installation.md` in the toolkit, AWS section.

## 6. Summary

Finish with: files created, what remains to configure, and the first command to try (`/agentic:epic`).
