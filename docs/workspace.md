# Workspace mode (multi-repo)

[Français](fr/workspace.md)

A **workspace** is a folder that contains several git repos of one product (for example an app, its backend, an embedded service and a releases repo). You run Claude Code at its root to work full-stack with the context of every repo.

```
my-product/                     <- workspace root (run Claude Code here)
  .agentic/workspace.yml        <- repo map, Monday board, contracts, order
  CLAUDE.md                     <- cross-repo product context
  app/          (git repo)      <- its own .agentic/pipeline.yml and workflows
  backend/      (git repo)      <- its own .agentic/pipeline.yml and workflows
  firmware/     (git repo)      <- its own .agentic/pipeline.yml and workflows
```

## Detection

Every skill looks for `.agentic/workspace.yml` in the current folder, then in parent folders. If it exists, the skill switches to workspace mode and reads this page. Otherwise it works on the current repo only (repo mode).

## What lives where

| Item | Location | Why |
|---|---|---|
| Repo list, roles, contracts, order | `workspace.yml` (root) | cross-repo view, used locally by the agents |
| Monday board | `workspace.yml`, **copied** into each `pipeline.yml` | a repo's CI cannot see the workspace root |
| Commands, stack, deployment | each repo's `pipeline.yml` | CI and GitHub workflows run per repo |
| GitHub workflows | each repo | GitHub Actions runs per repo |

Recommendation: version the workspace root as a small private **meta-repo** holding `workspace.yml`, `CLAUDE.md` and a `.gitignore` that excludes the repo folders. The whole team then shares the same map. Otherwise the root stays a plain local folder.

## `workspace.yml` schema

```yaml
version: 1
workspace: my-product
description: One sentence about the product.

monday: { ... }            # same block as in pipeline.yml

git:
  branch_pattern: "{type}/{item_id}-{slug}"

repos:
  - name: app              # short name used in tickets
    path: app              # relative to the workspace root
    github: my-org/app
    base_branch: main
    role: React/Tauri application, MQTT client
  - name: firmware
    path: firmware
    github: my-org/firmware
    base_branch: master
    role: Embedded C++ service, publishes machine state over MQTT
  - name: releases
    path: releases
    github: my-org/releases
    role: Public installers and update manifest
    ci: false              # no pipeline (publishing repo)

# Shared interfaces: the review checks that both sides stay consistent.
contracts:
  - name: MQTT topics and payloads
    owner: firmware        # source of truth
    paths:
      - firmware/include/topics.h
      - app/packages/core/src/topics.ts

# Merge and deploy order when a ticket spans several repos:
# the producer of an interface before its consumers.
order: [firmware, app]
```

## Multi-repo flow rules

**Epics and tickets**
- The planner explores every repo in `repos` (repos with `ci: false` only when relevant).
- Each ticket lists its repos (`Repo(s): firmware, app`). A ticket stays a vertical slice, even across repos.
- When a contract changes, the ticket says so explicitly and describes compatibility (versioning, optional field, dual read during the migration).

**Implementation**
- **Same branch name** in every touched repo.
- Work follows `order`: the repo that owns the contract first.
- Lint, test and build run in each touched repo, with its own `pipeline.yml`.
- **One pull request per repo**, each with a "Linked PRs" section pointing to the others. The Monday ticket gets the full list.
- The ticket moves to review when all its pull requests are open and green.

**Review**
- Locally, `/agentic:review <ticket id>` reviews **all** the ticket's pull requests as one change, and checks both sides of every touched contract.
- In CI, each repo reviews its own pull request; with the `context-repos` input, the workflow also clones sibling repos read-only so Claude sees the other side of the contract.

**Merge, deploy, QA**
- Merge in `order`. A consumer is merged only after its producer.
- Each repo keeps its own deployment. QA starts once every repo of the ticket is deployed to staging.
- In workspace mode, `/agentic:release` prepares a coordinated release: per-repo list, deploy order, shared Monday tickets.

## Multi-repo guardrails

- Never commit in a repo that is not listed in `workspace.yml`.
- Check `git status` in each repo before creating a branch: if a repo has uncommitted work in progress, stop and ask.
- Never mix changes for two products (two workspaces) in one ticket.
