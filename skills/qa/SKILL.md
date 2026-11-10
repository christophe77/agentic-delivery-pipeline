---
name: qa
description: QA fonctionnelle dans un vrai navigateur (Playwright MCP en CI, Playwright ou Claude in Chrome en local) - déroule les critères d'acceptation et scénarios QA d'un ticket ou d'une PR sur une URL de staging ou de preview, capture preuves et erreurs, et publie le rapport sur la PR et dans Monday.
argument-hint: "<url> [id ticket Monday | numéro de PR]"
---

# QA navigateur

Entrée : `$ARGUMENTS` = URL cible (sinon `qa.staging_url`), plus un ticket Monday ou une PR.

## 1. Scénarios

Sources, dans cet ordre :
1. Section « Scénarios QA » et critères d'acceptation du ticket ou de la PR ;
2. Fichiers `qa.scenarios_dir/*.md` (parcours de non-régression permanents : connexion, parcours critique…) ;
3. Si rien n'existe, déduis 3 à 5 parcours depuis le diff et dis-le dans le rapport.

Les identifiants de test viennent des variables d'environnement listées dans `qa.credentials_env` (ex. `QA_USER_EMAIL`, `QA_USER_PASSWORD`), jamais du repo. Utilise uniquement des comptes de test et l'environnement de staging ; ne lance jamais la QA sur la production.

## 2. Exécuter

Délègue au subagent `qa-tester`, un scénario à la fois :
- naviguer, agir, vérifier le résultat attendu ;
- capture d'écran à chaque vérification ;
- relever les erreurs console et les requêtes réseau en échec (4xx/5xx) ;
- tester aussi la largeur mobile (375 px) pour les parcours UI.

## 3. Rapport

```
## QA <ticket/PR> sur <url> : PASS | FAIL
| Scénario | Résultat | Preuve | Notes |
Erreurs console / réseau :
Limites (non testé, données manquantes) :
```

- PR : commentaire avec le rapport (`gh pr comment`).
- Monday : update sur le ticket ; statut `statuses.qa_passed` si tout passe, sinon retour à `statuses.in_progress` avec les échecs.
- Sauvegarde le rapport et les captures dans `.agentic/runs/<date>-qa/` (ignoré par git) ; en CI, ils sont publiés en artefact.
