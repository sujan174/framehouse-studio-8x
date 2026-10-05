# Security and correctness review

Reviewed 2026-10-06 against the current application source, migrations, Railway configuration, Namespace workflow, captured logs, and the live project page. This review is limited to the existing project and image workflow.

## Confirmed findings fixed in source

| Severity | Location | Reproduction and impact | Fix and evidence |
| --- | --- | --- | --- |
| Medium | `src/server/request-policy.ts`, `readSmallJson` (previously in `src/server/http.ts`) | Send a large chunked JSON body with no `Content-Length` to a project or generation mutation. The old `request.text()` consumed the entire body before testing its length, allowing excessive request memory use. | Stream at most 4,096 UTF-8 bytes, cancel the reader on overflow, then parse. The bounded-stream regression test passes. |
| Medium | `src/server/projects/repository.ts`, `archiveProject`; `src/server/generations/repository.ts`, `finishGeneration` | Claim a generation, archive its project while the provider call runs, then complete the call. The old code marked only queued work failed and would store a successful image against an archived project. It remained inaccessible through the project API but used private storage and reported a false success internally. | Archive marks queued and running work failed. Only a claimed running job can complete. PostgreSQL tests verify that a late image is discarded and no image row is stored. |

## Entry points and boundaries checked

- `src/app/studio/layout.tsx` and project pages require a Clerk session; `currentTenant` derives user, active organization, and role from `auth()` rather than request parameters. Project and generation repositories include the organization in lists, counts, details, edits, submissions, and image reads. The image route first checks an active project and successful generation, then retrieves bytes by generation ID and organization. Its responses use `private, no-store` and `nosniff`.
- Project and generation mutation routes check origin and `X-Workspace-Id` against the server session. Their JSON schemas reject ownership fields and unsupported settings. A stale workspace header fails after a session switch. A request already authorized before a switch can finish in its original workspace; switching does not revoke a request in flight.
- Archive authorization permits the creator or a Clerk organization admin. Archived projects disappear from active reads and their image endpoints return 404. The regression suite uses real PostgreSQL for cross-organization IDs, forged input, role restriction, absent tenant context, archive state, duplicate submission, daily limits, worker ownership, and failure recovery. It does not simulate the Clerk browser session itself.
- The queue uses a PostgreSQL transaction and row lock to claim jobs, a global advisory lock to permit one provider call, idempotency keys, per-member and global daily caps, a 45-second provider timeout, and two-minute stale-running recovery. Success stores the JPEG and status in one transaction. Provider errors produce terminal failure codes; no automatic inference retry occurs.
- `railway.json` applies migrations before deploy and requires database readiness. The production runtime has one web service and private PostgreSQL. The public health route reports readiness only. The Namespace workflow runs lint, typecheck, PostgreSQL integration tests, and build on push and pull requests.

## Evidence and limits

- Local isolated PostgreSQL 18.6: 26 tests passed; lint, typecheck, and production build passed. The tests are also run in CI against PostgreSQL 17 on `namespace-profile-main`.
- An all-history scan of 300 Git objects found no Clerk secret, bearer token, or private key pattern. The only Cloudflare token assignment match was the placeholder in `.env.example`. This pattern scan cannot prove that all conceivable credential formats are absent. No token values were printed.
- `npm audit --omit=dev` reported zero production advisories. Full `npm audit` reported nine advisories in development tooling, including `drizzle-kit` and `eslint-config-next` transitive dependencies. npm's suggested fixes downgrade major tool versions; no production runtime advisory was reported. Keep build tools off the public network and revisit when compatible upstream fixes exist.
- The existing live deployment is attested by Railway deployment `581e27d7-6ce2-461d-b026-0d724e06de42` with status `SUCCESS`, a CLI message naming source commit `26543b09117ac3de270272a668aea79cca3ae589`, and its passing [Namespace CI run](https://github.com/sujan174/framehouse-studio-8x/actions/runs/37365432237). Railway CLI uploads leave `commitHash` empty, so the commit cannot be corroborated through that field.
- At 390×844 on the live domain, the project composer, image feed, and controls rendered without horizontal overflow (`scrollWidth` 375; viewport 390). An authenticated private image was saved to disk, decoded as a 1024×1024 JPEG, and opened visually. The app's Download button fetched the image, but the in-app browser did not expose its native save event; the saved file came from the same authenticated image element through browser media download.
- Cloudflare's current [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) allows 10,000 free neurons per day on Workers Free and charges beyond that on Workers Paid. The scoped inference token returned 403 when asked for account details, so this account's actual plan has not been established. A Cloudflare dashboard owner should confirm Workers Free before further inference testing.
- Clerk still uses a development instance on the Railway domain. Railway's GitHub App installation is unavailable for this repository, so deployments are manual after the matching CI run rather than natively gated by Wait for CI.

## Capture duplication

The historical session log contains paired entries with matching content 0.01–0.6 seconds apart. The transcript bridge and repository `UserPromptSubmit`/`Stop` hooks were both writing the same session. The bridge process was stopped; the hooks remain configured. `capture_current_session.py` now refuses to start alongside configured hooks unless `--allow-with-hooks` is explicitly supplied for an older session where hooks are known to be inactive. Historical entries remain intact.

## Follow-up before the next milestone

Confirm the Cloudflare Workers plan from the account dashboard. Continue using the existing scoped token only for inference. For production use beyond this assignment, replace the Clerk development instance with a production instance and domain, and connect Railway's GitHub App so the release can wait for CI without a manual attestation.
