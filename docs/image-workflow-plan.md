# Image workflow implementation plan

Date: 2026-10-06. Scope: one real FLUX.1 schnell text-to-image flow inside a project. The provider integration is gated on a successful real request with a Workers Free account and a scoped token. No paid usage is authorized.

## User flow

The project page opens on a combined composer and asset feed. A creator enters a prompt, may change the supported step count (default 4, maximum 8), and starts one image. The page shows queued, generating, success, or failure with a clear retry. A successful card previews the image, offers Download, and can copy its prompt and steps into the composer for a new version. The prompt and generation history come from PostgreSQL, so a reload or later sign-in restores them. Project settings move to a secondary section.

## Data and authorization

Use an `image_generations` table with explicit organization, project, creator, prompt, steps, seed, status, timestamps, failure category, and client submission ID. Store a successful JPEG in a separate private PostgreSQL image table, bounded in size. This reuses the existing private Railway database for the small assignment workload. List endpoints select metadata only. Every read and mutation joins the active project and organization from Clerk's verified server session; guessed IDs return a generic unavailable result. The preview and download routes return bytes only after the same check, with private, no-store headers. No browser receives the provider token or direct storage location.

## Execution and limits

The web process runs a bounded queue worker. PostgreSQL records each submission and a unique client submission ID prevents repeated clicks or request retries from creating duplicate jobs. One provider call runs globally at a time, with a timeout and a small daily submission cap. A process restart marks abandoned running jobs failed after their lease expires; queued work can resume. A provider quota error is terminal and clearly labeled. No automatic provider retry can silently spend a second inference. The worker validates the provider envelope and JPEG before storing it and marking success in one database transaction.

## Review slices

1. Verify Cloudflare access with one real test request; record only status, image type, size, and plan eligibility, never token or image bytes in logs.
2. Add migrations, tenant-scoped repository, and PostgreSQL tests for forged tenant input, guessed generation and image IDs, archived projects, duplicate submission, limits, and stale recovery. Review the diff.
3. Add provider adapter and bounded worker with injected fake provider tests for timeout, quota, malformed output, and restart recovery. Review the diff.
4. Add route handlers and the responsive composer/feed, then check desktop, phone, keyboard, and error states. Review the diff.
5. Run lint, typecheck, PostgreSQL tests, build, and GitHub Actions. Deploy only after green CI. Verify a real image, reload persistence, prompt reuse, download, and denied cross-workspace access on the live domain. Commit capture milestones and document exact evidence.

Deferred: video, uploads, model catalogue, canvas editing, sharing, and billing.
