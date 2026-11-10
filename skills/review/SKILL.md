---
name: review
description: Revue de code d'une PR ou du diff courant - correction, sécurité, couverture des critères d'acceptation du ticket Monday - avec des subagents en parallèle et vérification de chaque finding. Poste en commentaires inline dans la CI, rapporte en local.
argument-hint: "[numéro de PR]"
---

# Revue de code

Entrée : `$ARGUMENTS` = numéro de PR (sinon : diff de la branche courante contre `git.base_branch`).

## 1. Rassembler

- Diff : `gh pr diff <n>` ou `git diff <base>...HEAD`. Description de PR : `gh pr view <n>`.
- Ticket Monday : ID depuis le nom de branche ou le pied `Monday: #id`. Lis ses critères d'acceptation (MCP Monday si disponible ; en CI sans token Monday, utilise la section « Critères d'acceptation » de la PR).
- `CLAUDE.md` et `.agentic/pipeline.yml` pour les conventions.

## 2. Analyser en parallèle

Lance ces subagents dans le même message :
- `reviewer` : bugs, cas limites, régressions, gestion d'erreurs, concurrence, performance évidente, cohérence avec le code voisin.
- `security-reviewer` : secrets, injections, authz/authn, données sensibles dans les logs, dépendances, IaC.

Puis toi-même : chaque critère d'acceptation est-il implémenté **et** testé ?

## 3. Vérifier

Pour chaque finding, relis le code réel autour de la ligne et écarte ce qui n'est pas démontrable (scénario concret d'échec requis). Pas de remarques de style que le linter couvre déjà.

## 4. Rapporter

- **En CI** (variable `GITHUB_ACTIONS=true`) : un commentaire inline par finding confirmé (outil de commentaire inline de l'action, ou `gh`), puis un commentaire de synthèse : verdict (OK / changements demandés), findings par gravité, critères couverts / non couverts.
- **En local** : la même synthèse dans le chat, et propose de corriger.
- Ne valide jamais la PR et ne merge jamais : le merge reste humain.
