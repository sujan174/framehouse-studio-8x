# Creative studio milestone

## Product choices

- One supported image model remains FLUX.1 schnell. Three prompt directions are transparent editable templates. Their thumbnail graphics are original CSS compositions and are labeled as visual guides, never generated examples.
- Creation and gallery share a project view. The composer is compact and the image grid receives most desktop width. Storyboard is a separate project view; settings remain secondary.
- The shortlist and storyboard are project-owned metadata. Selecting, comparing, captioning, reordering, and exporting do not call the provider or consume image quota. Comparison is a temporary view of two saved images; shortlist and board persist.
- Boards use at most eight successful images, with short captions and explicit Earlier/Later controls. Export is a server-rendered PNG contact sheet. The work is a manually curated visual story, not a video or a character-consistency system.

## Security and implementation

The active Clerk organization and user come from the verified server session. Reads and writes for curation require the active, unarchived project in that organization. The save transaction locks the project, validates every shortlist and frame ID against a successful image in the same organization and project, and rejects stale revisions. Export resolves every private image through the existing tenant-scoped image path and sends `private, no-store` with attachment disposition. Mutations retain origin and workspace-header checks. Input is bounded by the existing 4,096-byte JSON reader and strict schemas.

## Verification

Local PostgreSQL integration tests cover persisted selections, quota neutrality, cross-workspace and mixed-project IDs, forged ownership, stale revisions, archived boards, and PNG dimensions and text pixels. The complete live journey, export font correction, phone layout, and CI/deployment evidence are recorded in [verification.md](verification.md). The browser blocked a direct Beta-workspace export URL check; the PostgreSQL denial test passed, but that specific live request remains unobserved.
