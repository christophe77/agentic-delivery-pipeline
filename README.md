# agentic-delivery-pipeline

Pipeline de livraison logicielle pilotée par des agents Claude Code, de l'épic Monday jusqu'à la mise en production sur GitHub et AWS.

```
besoin ─▶ épic ─▶ tickets ─▶ dev + tests ─▶ PR ─▶ revue IA ─▶ merge ─▶ staging ─▶ QA navigateur ─▶ production ─▶ Monday "Terminé"
          (Monday)  (Monday)   (local)              (CI)      HUMAIN   (AWS/GitHub) (CI, Playwright)  HUMAIN
```

Agnostique de la stack : NestJS / Node, React, C# / .NET, Go, Flutter, Tauri, et monorepos (Turborepo, pnpm workspaces).
**Aucun secret dans aucun repo** : GitHub Secrets pour les clés d'API, OIDC pour AWS, garde-fou qui empêche l'agent de lire ou d'écrire des secrets.

## Une pipeline globale ou une par repo ?

**Les deux, en deux couches :**

| Couche | Où | Contenu | Change… |
|---|---|---|---|
| **Globale** (ce repo) | `christophe77/agentic-delivery-pipeline`, versionné par tags `v1`, `v1.2`… | Plugin Claude Code (skills, subagents, garde-fou) + workflows GitHub **réutilisables** (CI, revue, QA, déploiement, scan de secrets) | rarement, pour tous les projets à la fois |
| **Par repo** (chaque projet) | `.agentic/pipeline.yml` + 3 petits workflows appelants + section `CLAUDE.md` | Ce qui est propre au projet : stack et commandes, packages, board Monday, cibles de déploiement, URL de staging | avec le projet |

Pourquoi : la logique (comment on relit, teste, déploie) est écrite une fois et corrigée une fois. Chaque repo ne déclare que ses faits. Un monorepo est un repo comme un autre : il déclare plusieurs `packages`, et la CI comme le déploiement font un job par package.

Une pipeline unique centralisée qui irait chercher tous les repos serait plus fragile (droits croisés sur tous les repos, secrets centralisés, un échec bloque tout le monde) et moins lisible pour l'équipe de chaque projet.

## Contenu

```
.claude-plugin/          manifeste du plugin + marketplace (installation en une commande)
skills/
  pipeline-init/         installe la pipeline dans un repo (détection de stack)
  epic/                  besoin -> épic Monday
  tickets/               épic -> tickets Monday (tranches verticales, Given/When/Then)
  implement/             ticket -> branche, code, tests, PR
  review/                revue de code multi-agents (correction + sécurité + critères)
  qa/                    QA navigateur sur staging (Playwright MCP / Claude in Chrome)
  release/               mise en prod et clôture des tickets
agents/                  planner, reviewer, security-reviewer, qa-tester
hooks/ + scripts/guard.mjs   garde-fou PreToolUse (secrets, prod, push sur main)
.github/workflows/       workflows réutilisables : ci, secret-scan, claude-review, qa, deploy
templates/               pipeline.yml (NestJS, .NET, monorepo), workflows appelants, CLAUDE.md, scénario QA
infra/aws/               rôle OIDC CloudFormation + politique ECS minimale
docs/                    installation, sécurité
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

Le détail (secrets GitHub, environnements, rôle AWS) est dans [docs/installation.md](docs/installation.md).

## Portes humaines

L'agent prépare, un humain décide à trois endroits :
1. validation de l'épic et du découpage avant création dans Monday ;
2. merge de la PR (l'agent relit, il n'approuve ni ne merge) ;
3. mise en production (reviewers requis sur l'environnement GitHub `production`).

## Statut

v0.1 : à valider sur de vrais projets. Points à tester en priorité : voir [docs/installation.md](docs/installation.md#à-valider-lors-du-premier-essai).

## Licence

MIT
