# Agentic Delivery Pipeline pour Claude Code

[English](README.md) | Français

Pipeline de livraison logicielle pilotée par des agents Claude Code, de l'épic Monday jusqu'à la mise en production sur GitHub et AWS.

```
besoin ─▶ épic ─▶ tickets ─▶ dev + tests ─▶ PR → staging ─▶ revue IA + déploiement dev + QA dev ─▶ merge staging ─▶ déploiement staging + QA staging
          (Monday)  (Monday)   (local)                         (CI, à chaque push)                  HUMAIN            (CI, AWS/GitHub, Playwright)

─▶ PR staging → main ─▶ merge main + approbation prod ─▶ déploiement prod + QA prod (lecture seule) ─▶ Monday "Terminé"
   (/agentic:release)     HUMAIN                          (CI)
```

Deux branches longues, une par environnement : `staging` reçoit les PR de fonctionnalités, `main` ne reçoit que des PR de promotion depuis `staging`. Chaque PR est aussi déployée sur un environnement `dev` partagé pour être testée dans un navigateur pendant la revue. Le modèle à trois branches (`develop` → `staging` → `main`) et les projets qui gardent leur propre workflow de déploiement sont aussi supportés : voir [docs/fr/installation.md](docs/fr/installation.md#trois-branches-develop--staging--main).

Agnostique de la stack : NestJS / Node, React, C# / .NET, Go, Flutter, Tauri, et monorepos (Turborepo, pnpm workspaces).
**Aucun secret dans aucun repo** : GitHub Secrets pour les clés d'API, OIDC pour AWS, garde-fou qui empêche l'agent de lire ou d'écrire des secrets.

## Une pipeline globale ou une par repo ?

**Les deux, en deux couches :**

| Couche | Où | Contenu | Change… |
|---|---|---|---|
| **Globale** (ce repo) | `christophe77/agentic-delivery-pipeline`, versionné par tags `v1`, `v1.2`… | Plugin Claude Code (skills, subagents, garde-fou) + workflows GitHub **réutilisables** (CI, revue, QA, déploiement, scan de secrets) | rarement, pour tous les projets à la fois |
| **Par repo** (chaque projet) | `.agentic/pipeline.yml` + 3 petits workflows appelants + section `CLAUDE.md` | Ce qui est propre au projet : stack et commandes, packages, board Monday, cibles de déploiement, branches, URL de QA | avec le projet |

Pourquoi : la logique (comment on relit, teste, déploie) est écrite une fois et corrigée une fois. Chaque repo ne déclare que ses faits. Un monorepo est un repo comme un autre : il déclare plusieurs `packages`, et la CI comme le déploiement font un job par package.

Une pipeline unique centralisée qui irait chercher tous les repos serait plus fragile (droits croisés sur tous les repos, secrets centralisés, un échec bloque tout le monde) et moins lisible pour l'équipe de chaque projet.

## Mode workspace : travailler en fullstack sur plusieurs repos

Un produit est souvent réparti sur plusieurs repos (app, backend, service embarqué, repo de releases). On lance alors Claude Code **à la racine d'un dossier qui les contient tous**, avec un fichier `.agentic/workspace.yml` qui décrit les repos, leurs contrats (topics MQTT, API) et l'ordre de livraison.

- Un épic et ses tickets peuvent traverser plusieurs repos, avec le contexte de tout le produit.
- `/agentic:implement` crée la même branche dans chaque repo touché et ouvre une PR par repo, liées entre elles.
- `/agentic:review <ticket>` relit toutes les PR du ticket comme un seul changement et vérifie les contrats des deux côtés ; en CI, la revue peut cloner les repos voisins en lecture seule.
- Chaque repo garde sa propre CI et son propre déploiement.

Détails : [docs/workspace.md](docs/fr/workspace.md).

## Contenu

```
.claude-plugin/          manifeste du plugin + marketplace (installation en une commande)
skills/
  pipeline-init/         installe la pipeline dans un repo ou un workspace multi-repo (détection de stack)
  epic/                  besoin -> épic Monday
  tickets/               épic -> tickets Monday (tranches verticales, Given/When/Then)
  implement/             ticket -> branche, code, tests, PR
  review/                revue de code multi-agents (correction + sécurité + critères)
  qa/                    QA navigateur sur dev, staging et prod en lecture seule (Playwright MCP / Claude in Chrome)
  release/               PR de promotion staging → main et clôture des tickets
agents/                  planner, reviewer, security-reviewer, qa-tester
hooks/ + scripts/guard.mjs   garde-fou PreToolUse (secrets, prod, push sur staging et main)
.github/workflows/       workflows réutilisables : ci, secret-scan, claude-review, qa, deploy
templates/               pipeline.yml (NestJS, .NET, monorepo), workspace.yml, workflows appelants, CLAUDE.md, scénario QA
infra/aws/               rôle OIDC CloudFormation + politique ECS minimale
docs/                    installation, sécurité, mode workspace
```

## Démarrage rapide

```bash
# 1. Installer le plugin (une fois par machine)
claude plugin marketplace add christophe77/agentic-delivery-pipeline
claude plugin install agentic@agentic-delivery
```

Puis, dans le repo d'un projet :

```
/agentic:pipeline-init <board Monday>
/agentic:epic "Les utilisateurs doivent pouvoir exporter leurs commandes en CSV"
/agentic:tickets <id épic>
/agentic:implement <id ticket>
```

Le détail (secrets GitHub, environnements, rôle AWS) est dans [docs/installation.md](docs/fr/installation.md).

## Portes humaines

L'agent prépare, un humain décide à quatre endroits :
1. validation de l'épic et du découpage avant création dans Monday ;
2. merge de la PR dans `staging`, après revue IA et QA sur dev (l'agent relit et teste, il n'approuve ni ne merge) ;
3. merge de la PR de promotion `staging` → `main`, après QA staging ;
4. mise en production (reviewers requis sur l'environnement GitHub `production`), suivie d'une QA prod en lecture seule.

## Statut

v0.3 : à valider sur de vrais projets. Points à tester en priorité : voir [docs/installation.md](docs/fr/installation.md#à-valider-lors-du-premier-essai).

## Licence

MIT
