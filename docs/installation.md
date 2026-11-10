# Installation

## 1. Publier le toolkit (une fois)

```bash
gh repo create christophe77/agentic-delivery-pipeline --public --source . --push
git tag v1 && git push origin v1
```

Le repo doit être **public** pour que des repos d'autres comptes (ex. l'organisation d'un client) appellent ses workflows réutilisables. Il ne contient aucun secret, c'est fait pour.

Versionnage : les projets pointent sur `@v1`. Pour une évolution compatible, déplace le tag `v1` ; pour une rupture, crée `v2`.

## 2. Installer le plugin Claude Code (une fois par machine)

```bash
claude plugin marketplace add christophe77/agentic-delivery-pipeline
claude plugin install agentic@agentic-delivery
```

Pendant le développement du toolkit, charge-le directement depuis le dossier local :

```bash
claude --plugin-dir C:/www/agentic-delivery-pipeline
```

Monday : le connecteur Monday de Claude (OAuth) suffit en local. Playwright MCP est fourni par le plugin.

## 3. Brancher un projet

Dans le repo du projet : `/agentic:pipeline-init <board Monday>`. La skill génère `.agentic/pipeline.yml`, copie les workflows appelants dans `.github/workflows/` et complète `CLAUDE.md`.

## 4. Secrets et variables GitHub (par repo ou au niveau de l'organisation)

Tu les saisis toi-même : la valeur est demandée au prompt et n'apparaît ni dans le repo ni dans l'historique du shell.

| Nom | Type | Utilisé par | Obligatoire |
|---|---|---|---|
| `ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN` | secret | revue, QA | oui |
| `MONDAY_API_TOKEN` | secret | QA (mise à jour des tickets depuis la CI) | non |
| `QA_USER_EMAIL`, `QA_USER_PASSWORD` | secrets (environnement `staging`) | QA | si l'app a une connexion |
| `AWS_ROLE_ARN` | **variable** d'environnement (`staging`, `production`) | déploiement | si cible AWS |

```bash
gh secret set ANTHROPIC_API_KEY
gh secret set MONDAY_API_TOKEN
gh secret set QA_USER_EMAIL --env staging
gh secret set QA_USER_PASSWORD --env staging
```

Pour une organisation, mieux vaut des secrets d'organisation limités aux repos concernés :
`gh secret set ANTHROPIC_API_KEY --org mon-org --repos "repo-a,repo-b"`.

## 5. Environnements GitHub

```bash
gh api -X PUT repos/<owner>/<repo>/environments/staging
gh api -X PUT repos/<owner>/<repo>/environments/production
```

Puis dans Settings > Environments > production : **Required reviewers** (toi) et, idéalement, **Deployment branches** limité à `main`. C'est la porte humaine avant la prod.

## 6. AWS (OIDC, sans clé d'accès)

1. Crée la politique de déploiement à partir de `infra/aws/ecs-deploy-policy.json` (remplace REGION, ACCOUNT_ID, REPOSITORY, noms de rôles) :
   ```bash
   aws iam create-policy --policy-name gh-deploy-mon-repo --policy-document file://ecs-deploy-policy.json
   ```
2. Déploie le rôle, une pile par environnement (`CreateOidcProvider=true` seulement la première fois dans le compte) :
   ```bash
   aws cloudformation deploy --template-file infra/aws/github-oidc-role.yml --stack-name gh-oidc-mon-repo-staging --capabilities CAPABILITY_NAMED_IAM --parameter-overrides GitHubOwner=mon-org GitHubRepo=mon-repo Environment=staging CreateOidcProvider=true PolicyArns=arn:aws:iam::<compte>:policy/gh-deploy-mon-repo
   ```
3. Récupère l'ARN en sortie et pose la variable :
   ```bash
   gh variable set AWS_ROLE_ARN --env staging --body "arn:aws:iam::<compte>:role/gh-mon-repo-staging"
   ```

Idéalement, staging et production sont dans deux comptes AWS distincts.

## À valider lors du premier essai

Ces points dépendent de versions d'outils et n'ont pas encore tourné en conditions réelles :

- [ ] `claude-code-action@v1` : chargement du plugin via `--plugin-dir` et outil de commentaire inline.
- [ ] Résolution de `${MONDAY_API_TOKEN}` dans le fichier `--mcp-config` généré par `qa.yml`.
- [ ] Installation du navigateur pour `@playwright/mcp` en CI (version de Playwright alignée).
- [ ] `vars.AWS_ROLE_ARN` d'environnement lu depuis un workflow réutilisable d'un autre compte.
- [ ] Runner Windows : commandes `deploy.build` en bash (Git Bash) avec appel PowerShell.
- [ ] Garde-fou `scripts/guard.mjs` sous Windows (chemins avec antislashs).
