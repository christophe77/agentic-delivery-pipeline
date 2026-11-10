---
name: epic
description: Rédige un épic à partir d'un besoin (texte libre, fichier, compte rendu de réunion, doc Monday) et le crée dans le board Monday du projet après validation. Première étape de la pipeline agentique.
argument-hint: "<besoin, fichier ou lien>"
---

# Créer un épic

Entrée : `$ARGUMENTS` (besoin en texte libre, chemin de fichier, lien de doc ou de réunion Monday).

## 1. Contexte

- Lis `.agentic/pipeline.yml` (board Monday, statuts). S'il n'existe pas, propose `/agentic:pipeline-init` et arrête-toi.
- Lis `CLAUDE.md` et parcours le code concerné (Grep/Glob) pour ancrer l'épic dans l'existant : modules touchés, contraintes, dette.
- Si l'entrée est une réunion ou un doc Monday, lis-le avec les outils MCP Monday.
- Cherche dans le board un épic proche pour éviter les doublons.

## 2. Rédaction

Structure, en français, concise :

```
# <Titre orienté résultat>
## Contexte et problème
## Objectif mesurable
## Périmètre
## Hors périmètre
## Critères d'acceptation (niveau épic)
- [ ] ...
## Impacts techniques
(packages du monorepo / services / migrations / infra AWS / sécurité)
## Risques et questions ouvertes
## Découpage pressenti
(5 à 10 lignes, détaillé ensuite par /agentic:tickets)
```

Ne devine pas le métier : liste les zones d'incertitude dans « questions ouvertes ».

## 3. Validation humaine (obligatoire si `gates.epic_approval: true`)

Montre l'épic à l'utilisateur et demande validation ou corrections. N'écris rien dans Monday avant un oui explicite.

## 4. Création dans Monday

- Crée l'item dans le groupe `monday.groups.epics` du board, statut `statuses.todo`.
- Pose la description complète en update de l'item (markdown).
- Renseigne les colonnes connues dans `monday.columns` (type = Épic, priorité si donnée).
- Retourne l'ID et le lien de l'item, puis suggère `/agentic:tickets <id>`.
