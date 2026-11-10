# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's private vulnerability reporting instead: **Security** tab > **Report a vulnerability** on this repository.

Include the affected file or workflow, the impact, and steps to reproduce. You will get an answer within a few days.

## Scope

In scope: the guard hook (`scripts/guard.mjs`), the reusable workflows in `.github/workflows/`, the AWS templates in `infra/aws/`, and any instruction in `skills/` or `agents/` that could lead an agent to leak secrets or bypass a human approval.

## Using the reusable workflows safely

- Pin `christophe77/agentic-delivery-pipeline/.github/workflows/*.yml` to a commit SHA in sensitive projects, rather than to the `v1` tag.
- Never pass more secrets than a workflow declares.
- Keep required reviewers on your `production` environment.

See [docs/security.md](docs/security.md) for the full security model.
