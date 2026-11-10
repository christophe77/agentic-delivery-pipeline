# Sécurité
[English](../security.md)

Principe : **l'agent n'a jamais accès à un secret, et aucun secret n'est versionné.**

## Où vivent les secrets

| Secret | Emplacement | Qui y accède |
|---|---|---|
| Clé Anthropic / token OAuth Claude | GitHub Secrets (repo ou organisation) | runner CI uniquement |
| Token Monday (CI) | GitHub Secrets | runner CI, injecté au lancement du serveur MCP |
| Identifiants de test QA | GitHub Secrets de l'environnement `staging` | job QA uniquement |
| Accès AWS | **aucun secret** : OIDC, identifiants temporaires d'1 h | jobs de l'environnement correspondant |
| Secrets applicatifs (BDD, Stripe, Cognito…) | AWS Secrets Manager / SSM, référencés par la task definition ECS | l'application en exécution |
| En local | connecteurs OAuth de Claude, `.env` non versionnés, user-secrets .NET | toi |

## Défenses en profondeur

1. **Garde-fou local** (`scripts/guard.mjs`, hook PreToolUse) : bloque la lecture des `.env`, clés, `~/.aws/credentials`, fichiers `*secret*` ; bloque l'écriture de contenu qui ressemble à une clé AWS, Anthropic, GitHub, Stripe live, Slack, JWT ou clé privée ; bloque `printenv`, `aws configure`, `gh secret set`, déploiements prod manuels, push forcé et push direct sur `main`.
2. **Scan gitleaks** sur chaque PR et chaque push (`secret-scan.yml`) : la CI échoue si un secret entre dans l'historique.
3. **Rôles OIDC** restreints à `repo:<owner>/<repo>:environment:<env>` : une branche ou une PR ne peut pas assumer le rôle de production.
4. **Environnement `production`** avec reviewers requis : aucun déploiement prod sans approbation humaine.
5. **Revue sécurité** par le subagent `security-reviewer` sur chaque PR.
6. **Pas de revue sur les PR de forks** : leurs workflows n'ont pas accès aux secrets.
7. **Permissions minimales** déclarées job par job dans les workflows.

## Si un secret fuit

1. Révoquer immédiatement la clé chez le fournisseur (c'est la seule action qui compte).
2. En créer une nouvelle et la poser dans GitHub Secrets / Secrets Manager.
3. Nettoyer l'historique si besoin, en sachant que la clé doit être considérée comme compromise même après réécriture.

## Bonnes pratiques à garder

- Épingler les actions tierces par SHA dans les projets sensibles.
- Un compte AWS par environnement.
- Tokens Monday et Anthropic dédiés à la CI, avec le moins de droits possible, renouvelés régulièrement.
- Ne pas stocker de documents de secrets dans des dossiers de travail partagés avec l'agent : le garde-fou bloque les fichiers dont le nom contient `secret`, mais le plus sûr reste un gestionnaire de mots de passe.
