# Engineering rules

These are the user's ground rules for the assignment, interpreted for a one-day build. Apply them alongside [brief.md](../brief.md) and [foundation-build-brief.md](foundation-build-brief.md).

1. Capture is a required development gate. Verify the existing capture test and that this coding session is recorded before application implementation. Preserve the hook configuration and commit `.agent-logs/` during development. Do not fabricate exchanges or retroactively represent external planning as captured implementation.
2. Security and tenant isolation are design inputs. Derive identity and organization from the verified server session; require tenant scope at every data boundary and test negative access cases.
3. Keep the public repository free of credentials and personal user content. Avoid printing keys or environment files because assistant responses are captured. Commit an environment template with names and placeholders.
4. Prefer a small, cohesive application with explicit boundaries over speculative service layers. Provision services when a real workload requires them. Use Clerk for identity and organizations and Railway for hosting and the application database.
5. Use TypeScript strictly, validate external input at runtime, and keep data access server-only. Keep modules focused and interfaces readable. Avoid `any`, unbounded reads, duplicated permission logic, and silent fallbacks for missing infrastructure.
6. Write tests for meaningful behavior and risks: tenant boundaries, unauthorized writes, persistence, validation, and important user flows. Run lint, typecheck, tests, and a production build in CI. Do not optimize for a coverage percentage while missing boundary failures.
7. Review changes for authorization, data leakage, schema safety, error recovery, accessibility, and excessive scope. Fix material findings before calling a milestone done. Record a short review with evidence rather than saying that a review happened without detail.
8. Verify the actual deployed revision and live behavior. A local build, uploaded archive, or health status alone does not prove the user flow. CI must run, and the deployment path must respect its result.
9. Make interactions honest. A curated sample is a sample; an unsupported model is unsupported; an unavailable provider is unavailable. No pretend authentication, fabricated generation, fake progress, or green success state for a failed operation.
10. Keep the visual system consistent. Use the design guide's tokens, layout, states, and motion. Inspect rendered desktop and mobile output; remove broken navigation and dead controls.
11. Preserve the assignment's scope and time. Finish the authorized milestone, state what's working, and leave the next creative feature decision to the user. A reliable foundation must still lead to a useful creative product within the assignment window.
12. Maintain clear provenance. Research documents came from a separate planning conversation. The implementation prompt and resulting coding conversation belong in the real capture log. Never weaken capture to keep implementation out of the record.
