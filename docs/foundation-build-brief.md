# Foundation build brief

This is the first implementation milestone for the Higgsfield-inspired assignment. Read [brief.md](../brief.md), [design-philosophy.md](design-philosophy.md), and [engineering-rules.md](engineering-rules.md). The separate planning conversation prepared these documents. Application implementation belongs in the captured coding conversation.

## Outcome

Deploy a real application on Railway with Clerk authentication, organization-based tenant isolation, persistent projects in Postgres, a responsive creative-studio shell, and running CI. A visitor can open the public URL, sign up or sign in, create/select a workspace, create and edit a project, reload it, and switch workspaces without seeing another workspace's data.

This is a foundation milestone. The final assignment will need the creative features selected with the user. Do not treat auth and CRUD alone as the completed Higgsfield rebuild.

## Recommended sequence

Build a thin persistent project flow with auth and tenant enforcement from the beginning. Deploy the small application early, then refine the shared design system while the same flow remains working. This tests the boundaries where defects matter: session verification, active organization, database scope, migration, service configuration, and public access.

Adding security after creative features would require rewriting data access and ownership assumptions. Building a large infrastructure platform before a useful flow would consume the day without proving the system. Keep the first milestone narrow enough to demonstrate and extend.

## Architecture

Use one Next.js application with TypeScript, App Router, Clerk's current supported Next.js SDK, and PostgreSQL on Railway. Use npm if there is no established package manager. Pin dependencies through the lockfile. Use Drizzle with `pg` for typed SQL and committed migrations, unless inspection shows a compelling existing project convention to preserve. Use a small shared component library built from accessible primitives and the design tokens in the design guide.

Next.js serves the public page, authentication shell, studio pages, and server mutations. Clerk supplies identity, sessions, organization membership, and organization/account UI. Postgres stores application projects. Clerk is not our application database, and Railway is the hosting platform rather than an authorization layer.

Start Railway with the web service and Postgres. A bucket becomes necessary when we implement persisted media uploads or generated outputs. A worker becomes necessary when we choose long-running generation or processing jobs. Provision and deploy those as part of that feature, with private networking and durable jobs. There is no background workload in project CRUD, so an idle worker and Redis are not foundation requirements. Do not run detached background tasks inside a web request for future generation.

The user already has a Railway subscription and authorizes using it for this application. Additional paid inference services are outside the budget; free accounts and API keys are acceptable. Select and verify an inference provider later with the user. Do not pretend to serve Higgsfield's proprietary models.

## Routes and user journey

| Route concept | Purpose and access |
| --- | --- |
| `/` | Public introduction with actual current capability and sign-in/sign-up actions |
| `/sign-in`, `/sign-up` | Branded Clerk components using the installed SDK's supported routing |
| `/workspaces` | Signed-in selection/creation flow for users without an active organization |
| `/studio` | Projects for the verified active workspace |
| `/studio/projects/[id]` | Project detail and editing, checked against the active workspace |
| `/studio/settings` | Workspace/account controls through supported Clerk components and server access rules |
| `/api/health` | Public minimal readiness endpoint, no credentials or configuration details |

These route concepts can be adapted to framework routing requirements while preserving behavior. Return only safe internal locations after login. Do not add a separate application username requirement or the original's marketing quiz.

Every signed-in user works in a Clerk organization, including a solo workspace. Hide an unscoped personal-account mode. Provide a concise workspace creation flow and a visible switcher. Use the supported choose-organization task if the selected Clerk configuration requires it; inspect current documentation rather than inventing session-task behavior. Never use a fallback global tenant when `orgId` is absent.

For the first milestone, authorized members can list, view, create, and edit workspace projects. A project's creator or an organization admin can archive it. Workspace membership and role management remains governed by Clerk's supported controls. No external invitations need to be sent for setup or testing unless the user explicitly authorizes recipients.

## Persistence and tenant boundaries

The initial `projects` table needs a generated ID, non-null `clerk_org_id`, creator's Clerk user ID, title, optional short description, creation/update timestamps, and an archive timestamp. Index tenant plus update time and tenant plus ID. Limit titles to 120 characters and descriptions to 2,000 characters. Render submitted text as text. No raw HTML field is needed.

Implement a server-only tenant context helper that verifies the Clerk session and active organization. Keep the context narrow: user ID, organization ID, and the server-verified role or permission data needed for the operation. Do not construct this from browser state or accept a tenant ID from request input as authority.

Project access goes through a small repository that requires this context. List, count, detail, update, and archive queries include the verified tenant predicate. Scope SQL before fetching, rather than filtering an unscoped result in JavaScript. Reject a forged tenant field or ignore it in favor of the verified context consistently. Never allow mass assignment of organization, creator, archive metadata, or roles.

For inaccessible and missing project IDs, return the same generic 404. Authenticated users without an active workspace receive the selection flow or a clear API error. APIs return 401 for unauthenticated requests and 403 for unauthorized operations without leaking tenant data. Middleware helps route users but does not replace authorization in server functions and data access.

Do not share cached private results across identities. If caching is introduced, keys and invalidation must include the tenant, and permission-sensitive results must remain appropriately scoped. Clear or partition client state on workspace switch. Block stale writes during switching and verify the request's active organization on the server.

Initially store Clerk identifiers directly; do not create a second copy of the membership system or depend on webhooks for immediate authorization. If organization lifecycle synchronization is needed later, verify signatures and make processing idempotent. Tenant deletion and member revocation must be considered before adding that synchronization.

## Security and reliability

Validate server input with explicit schemas, length bounds, and strict update fields. Protect mutations against cross-site requests using the framework's supported mechanisms and explicit origin checks where applicable. Verify the chosen implementation against current framework documentation. Add a modest server-side limit to repeated project creation; any limit must work across instances, so avoid presenting an in-memory counter as durable enforcement.

Keep secret values server-only and out of source, logs, screenshots, build artifacts, and `.agent-logs/`. `.env.example` includes variable names and safe placeholders only. Use Railway reference variables for the database and secret configuration for Clerk. The browser receives only Clerk's publishable key and other genuinely public settings. Do not dump environment files or service variables into the conversation.

Use parameterized queries, safe error responses, and structured operational logs with request IDs. Avoid logging user content or credentials. Fail visibly when required configuration is absent. A readiness check should use a short bounded DB query and return a minimal 200/503 response; it should not depend on a Clerk network call for every probe.

## CI, migrations, and deployment

Create GitHub Actions running on pull requests and pushes to the deploy branch. Run lockfile-based installation, lint, typecheck, relevant tests, and the production build. Database integration tests use an isolated PostgreSQL service and committed migrations. Use test-safe public configuration and protected secrets only where needed; do not expose secrets to untrusted pull requests. Missing required tests or configuration must be visible, not silently skipped while reporting success.

Apply committed migrations in Railway's pre-deploy phase, with a bounded timeout and the migration dependencies present in the deployment image. A failed migration must prevent the new deployment. Keep schema changes compatible with the previously running version where relevant; a code rollback does not undo a destructive schema change.

Configure the web service to bind to Railway's injected port, a readiness path, an appropriate restart policy, and a public domain. Keep Postgres on private networking for application traffic. Save repeatable non-secret build/deploy configuration in the repository. Verify the selected Next.js build/start strategy; do not assume a standalone build automatically includes every runtime file.

Use Railway's GitHub integration with Wait for CI where available. The CI workflow must run on pushes to the deployment branch. If repository integration cannot be configured with the existing access, document that limitation and use a deployment workflow that executes only after required checks succeed. An initial CLI upload is acceptable, but is not evidence that future deployments are gated by CI.

For this milestone, one live environment is sufficient if tests use a genuinely isolated database. Explain the environment and any development-mode Clerk limitation honestly. Verify the public domain and Clerk origin/redirect configuration together. Do not label a deployment production-ready just because it responds once.

Official references checked during planning: [Railway Next.js](https://docs.railway.com/guides/nextjs), [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command), [healthchecks](https://docs.railway.com/deployments/healthchecks), [CI gating](https://docs.railway.com/deployments/github-autodeploys), [Clerk quickstart](https://clerk.com/docs/getting-started/quickstart), and [organization context](https://clerk.com/docs/nextjs/guides/organizations/getting-started). Railway deployment healthchecks run at deployment time; they do not provide continuous monitoring. Recheck APIs against installed versions before using them.

## Verification that matters

| Check | Required evidence |
| --- | --- |
| Public entry | Live URL opens in a fresh signed-out browser context without the owner's session |
| Real authentication | Clerk sign-up/sign-in, sign-out, redirects, and session persistence work on the deployed domain |
| No-workspace path | A new account can create/select a workspace and reach the studio |
| Persistence | Create and edit a project, reload, and observe saved values |
| Tenant isolation | Two organizations with distinct fixtures; list/detail/update/archive cannot cross the boundary, including guessed IDs and forged input |
| Authorization | Member cannot perform admin-only actions; unrelated member cannot archive a creator's project; absent sessions cannot mutate |
| Switching | Switching workspaces changes data without flashing or writing stale tenant data |
| Database correctness | Integration tests exercise real PostgreSQL queries and migrations, not only a mocked repository |
| UI quality | Desktop and phone-width screenshots, keyboard use, readable focus, responsive auth and project flows |
| CI | Actual workflow run is green for the deployed commit; link or run ID recorded |
| Deployment | Railway reports successful deployment for the intended code and the live flow works with DB readiness |
| Capture | This coding conversation's prompts/final responses are recorded and logs are committed with meaningful milestones |

Tests may use controlled verified-identity fixtures at the authorization boundary to exercise tenant data access without external Clerk network dependence. Production must use the real Clerk verifier. Such tests supplement, rather than prove, the deployed authentication flow. Use Clerk's supported testing approach for auth E2E and keep a separate manual live verification when necessary.

Review security and tenant queries before marking the milestone complete. Deliver the public URL, repository URL, deployed commit, CI evidence, screenshots, test results, and any unresolved limitations. Never report a skipped or unperformed check as passing.
