# Foundation verification

Date: 2026-10-05. Public test deployment: https://web-production-49e40.up.railway.app. Repository: https://github.com/sujan174/framehouse-studio-8x.

## Checked

- Signed-out public entry opened, and `/api/projects` returned 401 without a session.
- Clerk test account signed up with email verification, created a required organization, signed out, and signed back in. The existing workspace and project returned after sign-in.
- In the live Railway deployment, created a project in workspace Alpha, edited its description, reloaded the detail page, and observed the saved text.
- Created workspace Beta, switched to it, and observed no Alpha project. A guessed Alpha project URL showed the same generic unavailable view as a missing project. Beta held a separate project; switching back restored Alpha's list.
- Archived Beta's test project through the confirmation control and observed it disappear from the active list.
- Real PostgreSQL integration tests cover missing sessions, forged tenant input, cross-tenant list/count/detail/update/archive, archive role rules, validation, and creation rate limiting. Request policy tests cover origin and active workspace headers.
- Local lint, typecheck, integration tests, and production build passed. GitHub Actions runs those same checks on pushes to `main` and pull requests. See the Actions history for commit-specific evidence.
- Inspected the desktop and 390×844 phone views. See [desktop screenshot](verification/studio-desktop.jpg) and [phone screenshot](verification/studio-mobile.jpg).
- On the deployed project dialog, Escape closed the dialog and restored focus to New project; Shift+Tab from the title field moved focus to Close inside the dialog.
- Railway pre-deploy logs showed `Database migrations applied`, and the live readiness endpoint returned 200 after the schema existed.

The UI and persistence checks above were made against deployed commit `a60e16f008b72792e71d63ce3ca5860b5da7390b`. Its [GitHub Actions run](https://github.com/sujan174/framehouse-studio-8x/actions/runs/37354156404) passed.

## Remaining limitations

- Clerk is using its dedicated development instance on the Railway URL. A production Clerk instance needs a domain we control and production domain setup. The development-mode badge is visible.
- Railway reports `NO_INSTALLATION` for its GitHub App. Native autodeploy and Wait for CI cannot be enabled until the app is connected to this repository. The current deployment was manually triggered only after the matching GitHub Actions run passed. A project-token alternative was rejected by Railway as unauthorized.
- The selected creative workflow, generation provider, full catalogue, rich canvas, and assignment walkthrough are separate later milestones.
