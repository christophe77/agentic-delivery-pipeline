# Installation

[Français](fr/installation.md)

## 1. Install the Claude Code plugin (once per machine)

```bash
claude plugin marketplace add christophe77/agentic-delivery-pipeline
claude plugin install agentic@agentic-delivery
```

To work on the toolkit itself, load it from a local folder instead:

```bash
claude --plugin-dir /path/to/agentic-delivery-pipeline
```

Monday.com: the Claude Monday connector (OAuth) is enough locally. Playwright MCP ships with the plugin.

## 2. Wire a project

Type `/agentic:pipeline-init <Monday board link or ID>` in a Claude Code session (not in a shell), opened:
- **in the project repo** (repo mode): the skill writes `.agentic/pipeline.yml`, copies the caller workflows to `.github/workflows/` and adds a `CLAUDE.md` section;
- **in a folder that contains several repos** of one product (workspace mode): it also writes `.agentic/workspace.yml` and a root `CLAUDE.md`, then wires each repo. See [workspace.md](workspace.md).

The board can be given as a link (`https://<your-space>.monday.com/boards/1234567890`) or as its ID (`1234567890`).

## 3. GitHub secrets and variables (per repo or per organization)

You type the values yourself: they are prompted for, so they never land in the repo or in your shell history.

| Name | Type | Used by | Required |
|---|---|---|---|
| `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` | secret | review, QA | yes |
| `MONDAY_API_TOKEN` | secret | QA (ticket updates from CI) | no |
| `QA_USER_EMAIL`, `QA_USER_PASSWORD` | secrets of each environment (`dev`, `staging`, `production`), one test account per environment | QA | if the app has a login |
| `AWS_ROLE_ARN` | environment **variable** (`dev`, `staging`, `production`) | deploy | for AWS targets |
| `CONTEXT_REPOS_TOKEN` | secret | CI review in workspace mode (clones private sibling repos) | if `context-repos` is used |

`CONTEXT_REPOS_TOKEN`: a fine-grained token limited to the sibling repos, with **Contents: read-only** permission only, and an expiry date.

```bash
gh secret set ANTHROPIC_API_KEY
gh secret set MONDAY_API_TOKEN
gh secret set QA_USER_EMAIL --env staging
gh secret set QA_USER_PASSWORD --env staging
# same for --env dev and --env production (a dedicated read-only test account in production)
```

In an organization, prefer organization secrets limited to the relevant repos:
`gh secret set ANTHROPIC_API_KEY --org my-org --repos "repo-a,repo-b"`.

## 4. GitHub environments

```bash
gh api -X PUT repos/<owner>/<repo>/environments/dev
gh api -X PUT repos/<owner>/<repo>/environments/staging
gh api -X PUT repos/<owner>/<repo>/environments/production
```

Then in Settings > Environments:
- `dev`: deployed from pull requests, so any branch; give it its own AWS role and data, never shared with staging or production;
- `staging`: limit **Deployment branches** to `staging`;
- `production`: set **Required reviewers** and limit **Deployment branches** to `main`. This is the human gate before production.

## 4 bis. Branches

```
feature/* ──PR──▶ staging ──promotion PR──▶ main
           review + QA dev     QA staging        approval + QA prod
```

- Create `staging` from `main` if it does not exist, and set it as the default branch so PRs target it.
- Protect `staging` and `main`: pull request required, required checks green (review, CI, `qa-dev` on `staging`).
- Merge promotion PRs with a merge commit (not a squash) so both branches stay aligned.
- Write a few read-only scenarios in `.agentic/qa/production/` (pages load, login, key data visible): they are the only ones run in production.
- No `dev` environment? Remove the `ci`, `dev` and `qa-dev` jobs from `agentic-review.yml`.

### Three branches (develop / staging / main)

```
feature/* ──PR──▶ develop ──promotion PR──▶ staging ──promotion PR──▶ main
           review     deploy + QA dev     deploy + QA staging    deploy + QA prod
```

In `pipeline.yml`: `git.base_branch: develop`, `git.staging_branch: staging`, `git.production_branch: main`. Promotions: `/agentic:release prepare staging` then `/agentic:release prepare production`. In `agentic-review.yml`, set `branches: [develop]` and keep only the `review` job.

### Keeping your own deploy workflow

If the project already deploys with its own workflow (for example "on PR merged into develop / staging / main"), keep it and do not copy `agentic-deploy.yml`. Append the job from `templates/workflows/agentic-qa-job.yml` at the end of it: QA then runs right after each successful deployment, in the matching mode (dev, staging, read-only production). Adapt `needs:` to your deploy job and the GitHub environment names (`github-environment`, e.g. `development`).

## 5. AWS (OIDC, no access keys)

1. Create the deploy policy from `infra/aws/ecs-deploy-policy.json` (replace REGION, ACCOUNT_ID, REPOSITORY and role names):
   ```bash
   aws iam create-policy --policy-name gh-deploy-my-repo --policy-document file://ecs-deploy-policy.json
   ```
2. Deploy the role, one stack per environment (`CreateOidcProvider=true` only for the first stack in the account):
   ```bash
   aws cloudformation deploy --template-file infra/aws/github-oidc-role.yml --stack-name gh-oidc-my-repo-staging --capabilities CAPABILITY_NAMED_IAM --parameter-overrides GitHubOwner=my-org GitHubRepo=my-repo Environment=staging CreateOidcProvider=true PolicyArns=arn:aws:iam::<account>:policy/gh-deploy-my-repo
   ```
3. Read the role ARN from the stack outputs and set the variable:
   ```bash
   gh variable set AWS_ROLE_ARN --env staging --body "arn:aws:iam::<account>:role/gh-my-repo-staging"
   ```

Ideally, dev/staging and production live in separate AWS accounts. The `dev` role can be assumed by any pull request of the repo: give it access to the dev resources only.

## Versioning

Projects reference the reusable workflows with `@v1`. Compatible changes move the `v1` tag; breaking changes get `v2`. For sensitive projects, pin a commit SHA instead of a tag.

To call the workflows from repos in other accounts or organizations, the toolkit repo must be public (it contains no secrets by design). If you fork it, publish your fork the same way.

## To validate on the first run

These items depend on tool versions and have not yet run in real conditions:

- [ ] `claude-code-action@v1`: plugin loading through `--plugin-dir`, and the inline comment tool.
- [ ] Resolution of `${MONDAY_API_TOKEN}` in the `--mcp-config` file generated by `qa.yml`.
- [ ] Browser installation for `@playwright/mcp` in CI (aligned Playwright version).
- [ ] Environment-level `vars.AWS_ROLE_ARN` read from a reusable workflow owned by another account.
- [ ] Windows runner: `deploy.build` commands in bash (Git Bash) calling PowerShell.
- [x] Guard hook `scripts/guard.mjs` on Windows (backslash paths): tested.
