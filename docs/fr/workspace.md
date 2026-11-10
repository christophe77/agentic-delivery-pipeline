# Mode workspace (plusieurs repos)
[English](../workspace.md)

Un **workspace** est un dossier qui contient plusieurs repos git d'un même produit (ex. une app, son backend, un service embarqué, un repo de releases). On y lance Claude Code à la racine pour travailler en fullstack avec le contexte de tous les repos.

```
mon-produit/                    <- racine du workspace (Claude Code lancé ici)
  .agentic/workspace.yml        <- carte des repos, board Monday, contrats, ordre
  CLAUDE.md                     <- contexte produit transverse
  app/          (repo git)      <- .agentic/pipeline.yml + workflows propres
  backend/      (repo git)      <- .agentic/pipeline.yml + workflows propres
  firmware/     (repo git)      <- .agentic/pipeline.yml + workflows propres
```

## Détection

Chaque skill cherche `.agentic/workspace.yml` dans le dossier courant puis en remontant. S'il existe, la skill passe en mode workspace et lit cette page. Sinon, elle travaille sur le repo courant seul (mode repo).

## Ce qui vit où

| Élément | Emplacement | Pourquoi |
|---|---|---|
| Liste des repos, rôles, contrats, ordre | `workspace.yml` (racine) | vision transverse, utilisée en local par les agents |
| Board Monday | `workspace.yml`, **recopié** dans chaque `pipeline.yml` | la CI d'un repo ne voit pas la racine du workspace |
| Commandes, stack, déploiement | `pipeline.yml` de chaque repo | la CI et les workflows GitHub sont par repo |
| Workflows GitHub | chaque repo | GitHub Actions s'exécute par repo |

Recommandation : versionner la racine du workspace comme un petit **meta-repo** (privé) contenant `workspace.yml`, `CLAUDE.md` et un `.gitignore` qui exclut les dossiers des repos. Toute l'équipe partage ainsi la même carte. Sinon, la racine reste un simple dossier local.

## Schéma de `workspace.yml`

```yaml
version: 1
workspace: mon-produit
description: Une phrase sur le produit.

monday: { ... }            # même bloc que dans pipeline.yml

git:
  branch_pattern: "{type}/{item_id}-{slug}"

repos:
  - name: app              # nom court utilisé dans les tickets
    path: app              # relatif à la racine du workspace
    github: mon-org/app
    base_branch: main
    role: Application React/Tauri, client MQTT
  - name: firmware
    path: firmware
    github: mon-org/firmware
    base_branch: master
    role: Service embarqué C++, publie l'état machine en MQTT
  - name: releases
    path: releases
    github: mon-org/releases
    role: Installeurs publics et manifeste de mise à jour
    ci: false              # pas de pipeline (repo de publication)

# Interfaces partagées : la revue vérifie que les deux côtés restent cohérents.
contracts:
  - name: Topics et payloads MQTT
    owner: firmware        # repo qui fait foi
    paths:
      - firmware/include/topics.h
      - app/packages/core/src/topics.ts

# Ordre de merge et de déploiement quand un ticket touche plusieurs repos :
# producteur d'une interface avant ses consommateurs.
order: [firmware, app]
```

## Règles du flux multi-repo

**Épic et tickets**
- Le planner explore tous les repos de `repos` (sauf `ci: false` s'ils ne sont pas concernés).
- Chaque ticket liste ses repos (`Repo(s) : firmware, app`). Un ticket reste une tranche verticale, même s'il traverse plusieurs repos.
- Si un contrat change, le ticket le dit explicitement et décrit la compatibilité (versionnage, champ optionnel, double lecture le temps de la migration).

**Implémentation**
- **Même nom de branche** dans chaque repo touché.
- Travail dans l'ordre `order` : d'abord le repo qui possède le contrat.
- Commandes lint / test / build lancées dans chaque repo touché, avec son propre `pipeline.yml`.
- **Une PR par repo**, chacune avec une section « PR liées » qui pointe vers les autres. Le ticket Monday reçoit la liste complète.
- Le ticket passe en revue quand toutes ses PR sont ouvertes et vertes.

**Revue**
- En local, `/agentic:review <id ticket>` relit **l'ensemble** des PR du ticket comme un seul changement, et vérifie chaque contrat touché des deux côtés.
- En CI, chaque repo relit sa PR ; avec l'input `context-repos`, le workflow clone aussi les repos voisins en lecture seule pour que Claude voie l'autre côté du contrat.

**Merge, déploiement, QA**
- Merge dans l'ordre `order`. Le consommateur n'est mergé qu'après le producteur.
- Chaque repo garde son propre déploiement. La QA se lance quand tous les repos du ticket sont déployés en staging.
- `/agentic:release` en mode workspace prépare une release coordonnée : liste par repo, ordre de déploiement, tickets Monday communs.

## Garde-fous propres au multi-repo

- Jamais de commit dans un repo non listé dans `workspace.yml`.
- Vérifier `git status` de chaque repo avant de créer une branche : si un repo a du travail en cours non commité, s'arrêter et demander.
- Ne pas mélanger dans un même ticket des changements de deux produits (deux workspaces).
