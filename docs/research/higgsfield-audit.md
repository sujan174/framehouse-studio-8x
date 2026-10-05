# Higgsfield interface audit

Research date: 5 October 2026. Prepared in the planning conversation for the captured build agent. Source: direct browser inspection of [Higgsfield](https://higgsfield.ai/), supplemented by official product descriptions. The observations below do not instruct the agent to spend credits, accept terms, or publish content.

## Interface families

| Family | Observed structure | Evidence |
| --- | --- | --- |
| Explore | Dense horizontal navigation, lime promotion strip, landscape media carousels, studio/model/preset/community sections | [Explore](screenshots/01-explore-desktop.jpg) |
| Account entry | Large dark modal, cinematic media on one side, email and Google/Apple/Microsoft entry on the other; SSO option | Seen directly before the user authenticated; not retained as a screenshot |
| Onboarding | Tall media preview, centered questions, lime segmented progress, cards/chips, conditional follow-up | [Detailed audit](onboarding-audit.md) |
| Image | Large results area and bottom composer; references, elements, model, aspect ratio, quality, resolution, batch count, displayed credits | [Image studio](screenshots/12-image-studio-empty.jpg), [model picker](screenshots/13-image-model-picker.jpg) |
| Video | Workflow navigation, model/preset entry, reference input, prompt, generation settings, history and instructional content | [Navigation menu](screenshots/15-video-navigation.jpg), [stable video form](screenshots/16-video-studio.jpg) |
| Assets | Left search/filter/folder area, central media grid or empty state, fit and card-size controls | [Empty assets](screenshots/14-assets-empty.jpg) |
| Cinema Studio | Independent left sidebar with projects and account; central media and composer; grouped cinematic controls | [Home](screenshots/17-cinema-studio-home.jpg), [film setup](screenshots/18-cinema-film-setup.jpg) |
| Project | Contextual sidebar, folders, toolbar with view/filter/upload/share/publish, central assets, bottom composer | [Research project](screenshots/19-research-project.jpg) |
| Project brief | Editable title and document with context, narrative, visuals, production, status, resources, notes | [Brief editor](screenshots/20-project-brief.jpg) |
| Project settings | General details, access and publishing information, members, role matrix, usage and requests tabs | [General](screenshots/23-project-settings.jpg), [permissions](screenshots/24-project-permissions.jpg) |
| Canvas | Drawing/navigation tools, zoom, nodes, minimap, collaborator/activity/chat controls | [Canvas entry](screenshots/21-project-canvas.jpg), [mobile notice](screenshots/22-canvas-mobile.jpg) |
| Audio | Text to Speech, Voice Change and Translate modes; script, references, voice details, advanced settings; History/How it works split | [Audio](screenshots/25-audio-studio.jpg) |
| Effects | Preset-specific input form on the left; instructional view or searchable media grid on the right | [Form](screenshots/26-effects-workflow.jpg), [picker](screenshots/27-effects-picker.jpg) |
| Layers | Editorial entry with visual capability carousel, Upload Media action, saved edit-project area | [Layers](screenshots/28-layers-entry.jpg) |
| Marketing | Compact sidebar, media carousel, central image/video composer with avatar/product inputs, categorized template catalogue | [Marketing](screenshots/29-marketing-studio.jpg) |
| Video editing | Editing-tool selection opens a focused prompt/draw form with source video and references | [Tool selector](screenshots/30-video-edit.jpg), [form](screenshots/31-video-edit-form.jpg) |
| Motion control | Motion-video and character-image inputs, model and quality controls, scene-control option, instructional preset library | [Motion](screenshots/32-motion-control.jpg) |
| Product marketing | Huge editorial titles, cinematic previews, demonstrations of creative controls, lime or white CTA | [Cinema marketing](screenshots/11-cinema-marketing.jpg) |

The initial video screenshot was transitional. `16-video-studio.jpg` was replaced after revisiting and verifying the stable Create Video screen with Seedance 2.5 selected.

## Breadth and scope

The visible navigation exposed Image, Video, Audio, MCP/API, AI Influencer, Genjutsu, Ads, Effects, Cinema Studio, Contests, Marketing Studio, Supercomputer, 3D Jutsu, Edit, Academy, Community, Plugins, Canvas, and Originals. The video menu alone combines creation/editing workflows with a long model catalogue. This demonstrates scope, not a one-day feature list.

The [official Cinema Studio description](https://higgsfield.ai/cinematic-video-generator) presents a filmmaking workspace with references, genre and camera direction, shared projects, and team tools. The [official Canvas description](https://higgsfield.ai/canvas-intro) describes connected visual workflows. Those are product claims, not functionality verified in this account.

## Sampled visual measurements

| Sample | Rendered value |
| --- | --- |
| Body background | `rgb(15, 17, 19)` |
| Body text | `rgb(247, 247, 248)` |
| Promotional lime | `rgb(209, 254, 23)` |
| Utility font | Inter with system fallbacks |
| Display font | Space Grotesk with system fallbacks |
| Navigation | 14 px / 20 px, weight 500, radius 8 px, transitions about 200 ms |
| Sample Explore display heading | 56 px / 64 px, weight 700 |
| Sample Cinema marketing headings | 48 px / 56 px; larger titles 64 px / 72 px |
| Sample marketing buttons | 48–56 px high, radius 12 px |

The original uses very muted navigation text, media-led composition, compact controls, subtle surface edges, and lime active states. The sidebar studio is structurally different from the Explore site. Use the family's layout appropriate to the task rather than transplanting marketing navigation into every app screen.

## Patterns from the additional screens

Audio, effects, and basic video tools use a narrower input column beside a wider content/history area. Cinema and Marketing use a central composer with a project or studio sidebar. Layers uses an editorial upload entry. These three compositions cover the inspected tool families better than a single generic dashboard template.

Selecting `Cutout` in the effect picker changed the sidebar from Character/Location/Products inputs to a single Image input, and changed its displayed generation price. The form is capability-specific. If presets are selected for our final scope, their required fields, validation, and price/availability should follow a typed capability description rather than a universal form with ineffective controls.

The video editing catalogue exposes targeted editing, extension, reframing, upscaling, background removal, HDR, FPS, and depth-map options. The targeted-edit form allows Prompt or Draw, a video up to 30 seconds, and reference inputs. Motion Control requests a 3–30 second motion video and an image with a visible face/body. No source media was uploaded or processed.

Project settings displayed a private project and a not-published status. Team sharing was presented beside an Upgrade action. The permissions tab separates Owner, Admin, Collaborator, and Viewer and offers detailed defaults plus per-member overrides. These controls were inspected without changing permissions. Their presence does not prove enforcement or availability on the current plan. Our first policy is intentionally simpler and must be enforced independently by our backend.

The canvas menu exposes Home, Back, Project Feed View, create/open canvas, and undo/redo. Project Feed View successfully returned to the project's asset feed. Keep an obvious return path when any future tool takes over the screen.

## Verified action and limitations

A project titled `8x product research` was created and opened, with `References` and `Scenes` subfolders. The resulting project also displayed a default `Getting Started` folder. Its empty asset feed, project brief, and canvas entry were inspected. No project was published or shared and no personal files were uploaded.

The image draft exposed a displayed effective cost of 6.5 credits for its selected configuration; the video and cinema UI displayed 60 credits with a previous price of 80. These are account/configuration-specific observations, not stable prices or our app's proposed pricing. The account also displayed `All credits used`. No generation was submitted, so output playback, download, retry, and generation correctness remain unverified.

At 390 × 844, the inspected canvas route displayed `Mobile Access Coming Soon` with bottom navigation. This does not establish that all Higgsfield routes lack mobile support. The temporary viewport override was reset after inspection.

The user completed authentication. The research agent inspected onboarding, selected the evaluation preferences documented in the onboarding audit, and paused at the final combined terms/privacy/age acknowledgment for required user confirmation. A later read-only revisit to the onboarding route redirected to the signed-in homepage with no agreement dialog. The agent did not submit that acknowledgment and did not observe how the gate cleared. A separate updated-terms notice appeared in the image studio and was dismissed through its Close control without accepting it.

## Remaining research before creative feature implementation

Select the creative workflow with the user. When credits or a free supported route are available, follow the chosen workflow from draft through generation, persisted output, preview, and export. Other catalogue entries such as Supercomputer, 3D Jutsu, API/plugins, and specialized studios were identified but not fully exercised. Record any paid or unavailable steps honestly. Our foundation documents are ready to guide the shell; they do not satisfy the assignment's entire product-flow research requirement by themselves.
