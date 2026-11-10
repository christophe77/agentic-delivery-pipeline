---
name: implement
description: Implémente un ticket Monday de bout en bout - branche, code, tests, lint, build, commit, push et ouverture de la PR liée au ticket - en suivant les commandes du package déclarées dans .agentic/pipeline.yml. Met à jour le statut Monday.
argument-hint: "<id item ticket Monday>"
---

# Implémenter un ticket

Entrée : `$ARGUMENTS` = ID de l'item ticket Monday.

## 1. Préparer

- Lis `.agentic/pipeline.yml` et `CLAUDE.md`.
- Lis le ticket, ses updates et son épic parent (MCP Monday). Si les critères d'acceptation manquent ou sont ambigus, arrête-toi et pose la question.
- Vérifie que les dépendances du ticket sont terminées.
- Passe le ticket au statut `statuses.in_progress`.
- Branche : `git.branch_pattern` (défaut `{type}/{item_id}-{slug}`) depuis `git.base_branch` à jour. Travaille dans un worktree si la session le permet.

## 2. Coder

- Planifie brièvement (fichiers, ordre), puis implémente par petits pas.
- Tests d'abord quand c'est raisonnable : un test par critère d'acceptation.
- Respecte les conventions observées dans le code voisin plutôt que des préférences générales.
- Pour chaque package touché, lance ses commandes `commands.lint`, `commands.test`, `commands.build` (dans `path`). Tout doit passer avant de continuer. Ne désactive jamais un test ou une règle de lint pour passer.
- Aucun secret en clair : variables d'environnement, `.env.example` avec des valeurs factices, user-secrets .NET.

## 3. Livrer

- Commits conventionnels : `feat(api): ... ` avec en pied `Monday: #<item_id>`.
- Push de la branche.
- PR vers `git.base_branch` avec `gh pr create`, corps :

```
## Ticket
Monday #<id> : <titre> (<lien>)
## Changements
## Critères d'acceptation
- [x] ... (avec le test qui le couvre)
## Plan de test
## Scénarios QA
## Risques / migration / rollback
```

- Passe le ticket à `statuses.review` et poste le lien de la PR en update Monday.

## 4. Auto-revue

Avant de rendre la main, lance `/agentic:review` sur la PR en local et corrige les findings confirmés.
