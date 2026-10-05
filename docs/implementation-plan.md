# Foundation implementation plan

This plan implements [foundation-build-brief.md](foundation-build-brief.md) under [engineering-rules.md](engineering-rules.md). The current desktop chat began before project hooks were installed; its saved transcript is bridged into `.agent-logs/` by `capture_current_session.py`. New chats use the trusted repo hooks.

1. **Project slice:** Create the Next.js app, public page, branded Clerk auth, workspace selection, and responsive shell. Check build, desktop and phone layouts, and honest navigation. Commit the reviewed slice with its capture log.
2. **Persistence slice:** Add a committed Drizzle migration, server-only tenant context, strictly validated project repository and routes. Write negative tests first, then run them against isolated Postgres for missing sessions, guessed IDs, forged tenant fields, role denial, and cross-workspace reads and writes. Review every query predicate and commit.
3. **Interaction slice:** Connect create, list, detail, edit, archive, reload, and workspace switching. Prevent stale client writes while a switch is pending. Test the main flow and error states; review accessibility and responsive output, then commit.
4. **Delivery slice:** Add GitHub Actions for install, lint, typecheck, integration tests, and build. Create a dedicated GitHub repository, Clerk application, Railway project, Postgres, and web service without altering unrelated resources. Configure migrations, readiness, domain, and a CI-gated deployment path. Verify the deployed commit, workflow, signed-out entry, real authentication, persistence, and switching. Record results and limitations in the README.

Only Projects and workspace/account destinations belong in this milestone. Media generation, upload storage, workers, model selectors, and the final creative workflow remain later decisions.
