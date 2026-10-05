# Higgsfield onboarding observation

Observed on 5 October 2026 in the research browser. This document was prepared in the separate planning conversation. Authentication was completed by the user; this audit begins at the signed-in questionnaire. It does not claim that every signup method or questionnaire branch was tested.

## Observed sequence

| Step | Choices or behavior | Research selection | Screenshot |
| --- | --- | --- | --- |
| Use | Personal or team/organization; selection advances automatically | Personal | [Use](screenshots/02-onboarding-use.jpg) |
| Goal | Automation, marketing, cinematic visuals, viral content, avatars/product visuals, exploring | Just exploring | [Goal](screenshots/03-onboarding-goal.jpg) |
| Experience | Beginner, intermediate, advanced, expert; page says interface complexity adapts to experience | Expert, to expose controls for evaluation | [Experience](screenshots/04-onboarding-experience.jpg) |
| Studios | Supercomputer, MCP/CLI, Shorts, Canvas, Cinema, Marketing; multiple selection, explicit Continue | Cinema Studio | [Studios](screenshots/05-onboarding-studios.jpg) |
| Features | Avatars, upscale, lipsync, editing/inpaint, video generation, audio, image generation, presets; multiple selection | Image generation | [Features](screenshots/06-onboarding-features.jpg) |
| Referral | Social/search channels, AI assistants, word of mouth, other | Other: Software engineering assignment | [Referral](screenshots/07-onboarding-referral.jpg) |
| Frustration | New user, generation limits, prompting, workflow efficiency, inconsistent results, model cost | High cost of top models | [Frustration](screenshots/08-onboarding-frustration.jpg) |
| Cost follow-up | Modal compares annual generation allowances for Basic, Pro, Max; Continue dismisses it | Continue | [Comparison](screenshots/09-onboarding-cost-upsell.jpg) |
| Username and agreement | Suggested editable username; checkbox combines terms, privacy acknowledgment, and age 18+ confirmation | Agent paused without submitting; later revisit returned to the signed-in homepage | [Final step](screenshots/10-onboarding-terms.jpg), [later homepage](screenshots/33-onboarding-return-home.jpg) |

## Visual and interaction observations

The questionnaire replaces the crowded site navigation with a focused, full-height composition. A tall media panel occupies roughly one third of the desktop width on the left. The remaining area has a very dark background with a subtle grid, centered questions, choice cards or rounded chips, a segmented lime progress indicator, and a small back control. Headings use white for the first phrase and muted gray for the second. Media previews change across questions.

Single-choice questions advance automatically; the studio and feature questions require Continue. Controls briefly disable during transitions. There was no visible skip control in the inspected sequence. The cost concern produces an additional subscription comparison before access to the product. The agent paused at the final agreement. A later read-only revisit to `/quiz?rp=%2F` redirected to `/`, with no visible agreement dialog, and creation workspaces were accessible. The agent did not submit the final agreement and cannot attribute how that gate cleared.

## Implications to discuss before implementation

These are proposed product decisions, not validated user-research conclusions:

1. Preserve the focused composition and strong media preview, but reduce required setup to information necessary to enter a workspace.
2. Move referral attribution and marketing segmentation out of the critical path to first creation.
3. Make advanced controls an explicit, changeable setting instead of depending solely on an experience quiz.
4. Explain generation availability and cost close to the generation action. The observed cost follow-up explains plan volume, but does not establish what a new user can actually generate free.
5. Use a consistent advancement pattern and preserve Back navigation. Respect reduced-motion preferences when implementing transitions.

## Limits

Only the selected personal-use branch was traversed. Team setup, alternative answers, actual interface adaptation, and paid generation remain unverified. Entry to the signed-in site and creation workspaces was observed; the actual final agreement submission was not observed. Screenshots are research references and should not be treated as reusable application artwork.
