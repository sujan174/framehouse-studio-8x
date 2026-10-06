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

## Image workflow: local and provider checks (2026-10-06)

- A real FLUX.1 schnell REST request using the production Railway service variables returned a valid 365,729-byte JPEG. The initial request exposed a documentation mismatch: Cloudflare rejected `seed` as an additional property (HTTP 400, code 5006). The final request used only `prompt` and `steps`; the unsupported field was removed from the integration. The test script printed no credentials or image bytes.
- The `0002` and `0003` migrations applied locally. PostgreSQL integration tests covered cross-workspace generation and image access, forged ownership fields, archived projects, idempotency, outstanding-job and daily limits, stale running job recovery, terminal provider failures, and single global worker execution. The full suite passed: 22 tests in four files.
- Local lint, typecheck, and production build passed. A local page reload showed a saved failed generation with its prompt available for reuse. The worker moved a queued job to a terminal configuration failure after a process restart. Desktop and 390-pixel phone layouts were inspected; the phone view had no horizontal overflow.
- The corrected live release is deployment `581e27d7-6ce2-461d-b026-0d724e06de42`, uploaded from clean commit `26543b09117ac3de270272a668aea79cca3ae589`. Its [GitHub Actions run](https://github.com/sujan174/framehouse-studio-8x/actions/runs/37365432237) passed on the Namespace runner before deployment. Railway reported `SUCCESS`; the deployment metadata records that exact commit in its CLI message. CLI uploads do not populate Railway's `commitHash` field, so the source commit is attested by the clean checkout, CI SHA, and deployment message rather than Railway's commit metadata.
- On the live domain, created project `FLUX image study` in workspace Alpha. The first attempt failed because the worker sent internal database fields to Cloudflare; its terminal failure and prompt persisted. After the payload fix, used that prompt again, generated a real greenhouse image, opened its preview, and reloaded to find the image and both version records still present. The private image endpoint returned HTTP 200 with 923,876 response bytes on the corrected deployment. Clicking Download fetched the image endpoint successfully; the in-app browser did not surface a native download event, so saving to disk was not independently observed.
- Switched to workspace Beta: its project list contained zero projects, a direct Alpha project URL rendered the generic unavailable page, and the Alpha image endpoint returned HTTP 404 in Railway's HTTP logs. Switching back restored the Alpha project and image.
- The earlier local phone view at 390 pixels was checked for horizontal overflow. The in-app browser viewport override did not apply to the live tab, so live mobile rendering was not independently rechecked after deployment. The live desktop composer, generated image card, preview, persisted failure, and project settings were visually inspected.
- The GitHub Actions workflow now uses `namespace-profile-main`; [its first run](https://github.com/sujan174/framehouse-studio-8x/actions/runs/37365128988) and the corrected release run both passed.

## Focused security review (2026-10-06)

See [security-review.md](security-review.md) for findings, entry-point analysis, and remaining limits. The final reviewed source is commit `435fa4d017771eced8e89240f426fa3a8e0d6b32`, deployed as Railway release `928ce565-8d1f-495a-bb8e-dc232f24825e` after [Namespace CI run 37368434328](https://github.com/sujan174/framehouse-studio-8x/actions/runs/37368434328) passed lint, typecheck, 27 PostgreSQL tests, and build. Railway reported `SUCCESS`, pre-deploy migrations applied, and live health returned 200.

The review fixed unbounded JSON body reading, running image completion after archive, and an archived-project race in detail and image reads. The live phone viewport was rechecked at 390×844 without horizontal overflow. A private generated JPEG was saved to disk and opened at 1024×1024. The app Download control fetched the same image, but the in-app browser did not expose a native file save event. After the final deploy, Alpha images survived reload; Beta could not open Alpha's project URL, and signed-out project and image routes returned 401 with private no-store headers. The account owner confirmed Workers Free in the Cloudflare dashboard; the inference token cannot read billing settings.

## Creative studio journey (2026-10-06)

- Creative feature source `594d766d5e7e9cb025d63b60b9fe9d6017f78899` passed [Namespace CI 37370889784](https://github.com/sujan174/framehouse-studio-8x/actions/runs/37370889784) with lint, typecheck, 30 real PostgreSQL tests, and build. Railway deployment `a9dd2209-9c7f-4995-b79a-2440112c4f77` reached `SUCCESS` and applied migration `0004`.
- On the live Alpha project, selecting the Cinematic scene preset populated its editable prompt. Restoring the prior draft worked. An edited preset prompt generated a real new image, bringing the gallery to three successful images. Two images opened in comparison. Two were shortlisted and added to the board; captions were saved, the frame order was changed with the Earlier button, and the shortlist, ordered frames, captions, generated image, and draft remained after reload.
- The first exported file had valid images but square glyphs instead of title and captions. This was a confirmed live export defect. The font fix added DejaVu/fontconfig to the Railway runtime and specified the font in SVG text. Source `f573d016985b80bb1d165ec885451421ccac6660` passed [Namespace CI 37415699110](https://github.com/sujan174/framehouse-studio-8x/actions/runs/37415699110); its job used `namespace-profile-main`. Railway deployment `f18e1aca-ea8c-4243-b136-6bbb4ab721e6` reached `SUCCESS`, and build logs showed runtime font packages installed.
- The corrected app Export PNG button saved `framehouse-story-ffab48cd-5205-472b-9882-4fe3d8fbdb14 (1).png` in Downloads. `file`/`sips` identified a 1600×1140 PNG, and visual inspection showed both generated images, the full project title, numbered frames, and both captions with readable text. The live project list showed the new generated image as its real cover.
- At a 390×844 viewport on the final release, the creation view and storyboard rendered at 335 CSS pixels within a 390-pixel viewport; document scroll width was 375 pixels. The public entry returned HTTP 200 without cookies, health returned 200, and a signed-out export request returned 401. Switching to Beta showed zero projects; direct navigation to Alpha's project returned the generic unavailable page. Switching back to Alpha restored its project list.
- The browser blocked direct navigation to the Alpha private export route while Beta was active, so that exact live denial was not observed. The real-Postgres integration test rejects cross-workspace and mixed-project image IDs and returns no export for Beta. Clerk remains a development instance, and deployment remains manual after matching CI because the Railway GitHub App is not connected.
