# Security

[Français](fr/securite.md)

Principle: **the agent never has access to a secret, and no secret is ever committed.**

## Where secrets live

| Secret | Location | Who can read it |
|---|---|---|
| Anthropic API key / Claude OAuth token | GitHub Secrets (repo or organization) | CI runner only |
| Monday.com token (CI) | GitHub Secrets | CI runner, injected when the MCP server starts |
| QA test credentials | GitHub Secrets of the `staging` environment | QA job only |
| AWS access | **no secret**: OIDC, temporary credentials valid for 1 hour | jobs of the matching environment |
| Application secrets (database, Stripe, Cognito...) | AWS Secrets Manager / SSM, referenced by the ECS task definition | the running application |
| Local machine | Claude OAuth connectors, uncommitted `.env` files, .NET user-secrets | you |

## Defense in depth

1. **Local guard hook** (`scripts/guard.mjs`, PreToolUse): blocks reading `.env` files, keys, `~/.aws/credentials` and `*secret*` files; blocks writing content that looks like an AWS, Anthropic, GitHub, Stripe live or Slack credential, a JWT or a private key; blocks `printenv`, `aws configure`, `gh secret set`, manual production deploys, force pushes and direct pushes to `main`.
2. **gitleaks scan** on every pull request and push (`secret-scan.yml`): CI fails if a secret enters the history.
3. **OIDC roles** restricted to `repo:<owner>/<repo>:environment:<env>`: a branch or a pull request cannot assume the production role.
4. **`production` environment** with required reviewers: no production deploy without human approval.
5. **Security review** by the `security-reviewer` subagent on every pull request.
6. **No review on fork pull requests**: their workflows get no access to secrets.
7. **Least-privilege permissions** declared job by job in the workflows.

## If a secret leaks

1. Revoke the key at the provider immediately (the only step that really matters).
2. Create a new one and store it in GitHub Secrets or Secrets Manager.
3. Clean the history if needed, knowing the key must be treated as compromised even after a rewrite.

## Good practices

- Pin third-party actions by commit SHA in sensitive projects.
- One AWS account per environment.
- Dedicated CI tokens for Monday and Anthropic, with minimal rights, rotated regularly.
- Do not keep documents containing secrets in folders shared with the agent: the guard blocks files whose name contains `secret`, but a password manager is the safe place.
