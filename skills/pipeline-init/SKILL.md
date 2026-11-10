---
name: pipeline-init
description: Installe la pipeline agentique dans le repo courant. Détecte la stack (Node/NestJS, .NET, Go, Flutter, monorepo), génère .agentic/pipeline.yml, les workflows GitHub appelants et la section CLAUDE.md, puis liste les réglages GitHub et AWS à faire. À utiliser une fois par repo.
argument-hint: "[board Monday ID]"
---

# Initialiser la pipeline dans ce repo

Objectif : un repo prêt à utiliser `/agentic:epic`, `/agentic:tickets`, `/agentic:implement`, `/agentic:review`, `/agentic:qa`, `/agentic:release`, avec des workflows CI/CD minces qui appellent les workflows réutilisables du toolkit.

Les modèles sont dans `${CLAUDE_PLUGIN_ROOT}/templates/`.

## 1. Détecter la stack

Inspecte la racine et les sous-dossiers (2 niveaux) :

| Indice | Stack |
|---|---|
| `turbo.json`, `pnpm-workspace.yaml`, `nx.json`, `workspaces` dans package.json | monorepo (un package par app) |
| `package.json` avec `@nestjs/core` | node (NestJS) |
| `package.json` (React, Vite, Next…) | node |
| `*.sln`, `*.csproj` | dotnet (note `TargetFramework`, et si `net*-windows` : `runner: windows-latest`) |
| `go.mod` | go |
| `pubspec.yaml` | flutter |
| `Cargo.toml` + `src-tauri/` | tauri (node + rust) |
| `Dockerfile` | candidat au déploiement `aws-ecs` |

Lis les scripts existants (`package.json`, `Makefile`, `.github/workflows/*`) pour reprendre les vraies commandes install / lint / test / build au lieu d'en inventer. Détecte le gestionnaire de paquets via le lockfile.

## 2. Générer `.agentic/pipeline.yml`

Pars du modèle le plus proche (`pipeline.nestjs.yml`, `pipeline.dotnet.yml`, `pipeline.monorepo.yml`). Un repo simple a **un seul package** avec `path: .`. Un monorepo a un package par app déployable ou testable.

Demande à l'utilisateur ce que tu ne peux pas déduire, en une seule question groupée :
- ID du board Monday (argument `$ARGUMENTS` s'il est fourni) et libellés exacts de la colonne statut ;
- cible de déploiement de chaque package (`aws-ecs`, `github-release`, `command`, ou aucune) ;
- région AWS, noms de cluster / service / famille de task definition ECS ;
- URL de staging pour la QA.

Utilise les outils MCP Monday pour lire le board (colonnes et statuts) plutôt que de demander quand c'est possible.

**Aucun secret dans ce fichier** : uniquement des identifiants publics (board ID, noms de ressources, URLs). Si l'utilisateur colle un token, refuse de l'écrire et indique la commande `gh secret set` à lancer lui-même.

## 3. Copier les workflows appelants

Copie `templates/workflows/agentic-*.yml` dans `.github/workflows/`. Remplace `@v1` par la version du toolkit voulue. Ne touche pas aux workflows existants : signale les doublons (une CI déjà présente) et laisse l'utilisateur choisir.

## 4. CLAUDE.md

Ajoute (ou crée) une section à partir de `templates/CLAUDE.md.template` : conventions de branche, commandes du projet, définition de « fini », règles de sécurité. Si un CLAUDE.md existe, ajoute la section sans réécrire le reste.

Ajoute `.agentic-toolkit/` et `.agentic/runs/` au `.gitignore`.

## 5. Checklist de configuration (à afficher, ne pas exécuter)

Affiche les commandes que **l'utilisateur** lance lui-même, valeurs saisies au prompt :

```bash
gh secret set ANTHROPIC_API_KEY          # ou CLAUDE_CODE_OAUTH_TOKEN
gh secret set MONDAY_API_TOKEN           # optionnel : QA et release mettent Monday à jour depuis la CI
gh api -X PUT repos/{owner}/{repo}/environments/staging
gh api -X PUT repos/{owner}/{repo}/environments/production   # puis ajouter des reviewers requis dans Settings
gh variable set AWS_ROLE_ARN --env staging --body "arn:aws:iam::<compte>:role/<role-staging>"
gh variable set AWS_ROLE_ARN --env production --body "arn:aws:iam::<compte>:role/<role-prod>"
```

Rappelle le déploiement du rôle OIDC : `docs/installation.md` du toolkit, section AWS.

## 6. Résumé

Termine par : fichiers créés, ce qui reste à configurer, et la première commande à essayer (`/agentic:epic`).
