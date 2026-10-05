# Framehouse Studio

The first working foundation for the 8x creative studio assignment. The live product currently supports Clerk sign-in, organization workspaces, and persistent projects. Generation and canvas workflows are outside this milestone.

## Local setup

Use Node 24 and PostgreSQL 17 or newer. Create a Clerk application with Organizations enabled. Copy `.env.example` to `.env.local` and replace the placeholders. Keep `.env.local` private. Set `DATABASE_URL` to a local database, then run:

```sh
npm ci
npm run db:migrate
npm run dev
```

For integration tests, set `TEST_DATABASE_URL` to a separate disposable database. Tests truncate its projects table.

```sh
npm run lint
npm run typecheck
npm run test:db
npm run build
```

## Deployment

The Railway project uses one web service and PostgreSQL. Set `DATABASE_URL` on the web service to the Postgres service's private connection reference. Set Clerk's publishable and secret keys as service variables, along with the Clerk route variables from `.env.example`. `railway.json` builds the app, runs committed migrations before deployment, starts Next.js on Railway's port, and probes `/api/health`. Connect the `main` branch through Railway's GitHub integration and enable Wait for CI after the GitHub Actions workflow appears.

The GitHub workflow runs lint, typecheck, Postgres integration tests, and the production build on pull requests and pushes to `main`. It uses an isolated test database and needs no Clerk secret.

## Authorization model

Every private route derives the active organization and role from Clerk's verified server session. Project queries include the organization predicate in SQL. Members can create and edit projects; only the creator or an organization admin can archive one. Mutations require the browser origin and active workspace header to agree with the verified session. Twenty project creations per member and workspace are allowed per hour, enforced through a Postgres transaction.

See `docs/foundation-build-brief.md` for the scope, and `CAPTURE-TEST.md` for agent capture setup.
