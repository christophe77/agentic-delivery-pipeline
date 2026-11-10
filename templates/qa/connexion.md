# Scénario permanent : connexion

À copier dans `.agentic/qa/` du projet. Déroulé à chaque QA de staging.

1. Ouvrir la page d'accueil. Attendu : pas d'erreur console, page chargée en moins de 3 s.
2. Cliquer sur « Se connecter ». Attendu : formulaire ou redirection vers le fournisseur d'identité (Cognito).
3. Se connecter avec `QA_USER_EMAIL` / `QA_USER_PASSWORD`. Attendu : tableau de bord affiché avec le nom de l'utilisateur.
4. Recharger la page. Attendu : session conservée.
5. Se déconnecter. Attendu : retour à l'accueil, route protégée inaccessible.
6. Refaire l'étape 1 en largeur 375 px. Attendu : pas de débordement horizontal.
