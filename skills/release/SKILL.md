---
name: release
description: Prépare ou clôture une mise en production - liste les PR et tickets Monday livrés depuis la dernière release, rédige les notes de version, déclenche le workflow de déploiement et, après succès, passe les tickets en Done. Ne contourne jamais l'approbation de l'environnement production.
argument-hint: "[prepare | close] [version]"
---

# Release

Entrée : `$ARGUMENTS` = `prepare` (défaut) ou `close`, et une version optionnelle.

## prepare

1. Dernière release : `gh release list --limit 1` ou dernier tag.
2. PR mergées depuis : `gh pr list --state merged --base <base> --search "merged:>=<date>"`.
3. Tickets Monday associés (pied `Monday: #id` ou nom de branche) ; vérifie qu'ils sont au statut `statuses.qa_passed`. Signale tout ticket non validé en QA.
4. Notes de version groupées (Nouveautés, Corrections, Technique), en langage utilisateur, avec les liens Monday.
5. Montre les notes et la liste des tickets. Après un oui explicite, déclenche le déploiement :
   `gh workflow run agentic-deploy.yml -f environment=production -f version=<version>`
6. Rappelle que l'environnement GitHub `production` attend l'approbation d'un reviewer : c'est voulu, ne cherche pas à la contourner.

## close

Après un déploiement production réussi (`gh run list --workflow agentic-deploy.yml`) :
- tickets livrés au statut `statuses.done`, update Monday avec version et lien du run ;
- épic à `statuses.done` si tous ses tickets le sont ;
- publie les notes dans la release GitHub si elle existe.
