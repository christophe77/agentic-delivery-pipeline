# Permanent scenario: login

Copy into the project's `.agentic/qa/`. Run on every staging QA.

1. Open the home page. Expected: no console errors, page loaded in under 3 s.
2. Click "Sign in". Expected: a form, or a redirect to the identity provider (Cognito).
3. Sign in with `QA_USER_EMAIL` / `QA_USER_PASSWORD`. Expected: dashboard shown with the user's name.
4. Reload the page. Expected: session kept.
5. Sign out. Expected: back to the home page, protected route no longer accessible.
6. Repeat step 1 at a 375 px width. Expected: no horizontal overflow.
