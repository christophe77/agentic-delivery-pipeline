---
name: tickets
description: Découpe un épic Monday en tickets livrables (tranches verticales) avec critères d'acceptation Given/When/Then, package concerné, dépendances, plan de test et scénarios QA, puis les crée dans Monday après validation.
argument-hint: "<id item épic Monday>"
---

# Découper un épic en tickets

Entrée : `$ARGUMENTS` = ID de l'item épic Monday.

## 1. Comprendre

- Lis `.agentic/pipeline.yml`, puis l'épic et ses updates via MCP Monday.
- Délègue l'exploration au subagent `planner` : il cartographie le code concerné par package (`packages[].path`) et remonte fichiers, points d'extension, tests existants et risques.

## 2. Découper

Règles :
- **Tranches verticales** : chaque ticket livre une valeur testable de bout en bout ; pas de ticket « faire la base de données » isolé, sauf migration réellement préalable.
- Un ticket = une PR raisonnable (moins de 400 lignes de diff visées). Sinon, redécoupe.
- Dans un monorepo, un ticket peut toucher plusieurs packages ; liste-les.
- Ordonne par dépendances ; marque ce qui est parallélisable.

Format de chaque ticket :

```
## <Titre impératif>
Package(s) : api, portal
Type : feat | fix | chore | refactor
Estimation : XS | S | M | L
Dépend de : <titre ou id>
### Critères d'acceptation
- Étant donné ..., quand ..., alors ...
### Notes techniques
(fichiers, endpoints, migrations, flags)
### Plan de test
(unitaires, intégration, e2e)
### Scénarios QA navigateur
(parcours à dérouler par /agentic:qa ; « aucun » pour du backend pur testé par l'API)
```

## 3. Validation humaine

Présente la liste (titres, estimations, dépendances) puis le détail. Applique les corrections. Rien dans Monday avant un oui explicite.

## 4. Création dans Monday

- Crée les tickets en subitems de l'épic (ou en items du groupe `monday.groups.backlog` liés à l'épic, selon `monday.tickets_as`).
- Statut `statuses.todo`, description en update, colonnes estimation / package si elles existent.
- Retourne la table `id | titre | dépendances` et suggère `/agentic:implement <id>` sur le premier ticket débloqué.
