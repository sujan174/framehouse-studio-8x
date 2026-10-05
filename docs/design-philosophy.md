# Design philosophy: a focused creative studio

Prepared on 5 October 2026 in the separate planning conversation. This is the design reference for the captured implementation agent. The assignment in [brief.md](../brief.md) takes precedence over earlier requests for a pixel copy. Our goal is a recognizable creative studio with deliberate improvements and a small set of complete workflows.

## Product intent

A creator should be able to enter a workspace, find a project, understand the next action, and keep their work organized. The interface should make the output feel valuable and the controls feel dependable. The final generation features will be selected with the user after the foundation is deployed. This guide specifies the visual language and shell without authorizing a large catalogue of tools.

Higgsfield's strongest qualities are its cinematic media, restrained dark surfaces, electric lime accents, and compact creative controls. Its homepage communicates breadth and possibility, while Cinema Studio provides a calmer project-oriented environment. Our starting point is the latter. Spend visual attention on the work and the current action.

## Evidence and limits

Read the [research audit](research/higgsfield-audit.md) and [onboarding audit](research/onboarding-audit.md). Screenshots document the actual interface; measurements are samples of rendered elements rather than a complete extraction of the original design system.

Direct inspection covered Explore, the login entry, the personal onboarding questionnaire, image and video screens, the model picker, the asset library, Cinema Studio, film setup, a newly created project with folders, its brief editor, settings and permission controls, the canvas entry, Audio, Effects, Layers, Marketing, video editing, and Motion Control. A 390 × 844 viewport check showed a desktop-only notice for the inspected canvas route. Actual generation and output operations remain unverified because the account reports that all credits are used. The agent paused at the final onboarding agreement; a later revisit redirected to the signed-in homepage, without the agent submitting the acknowledgment. Do not describe this as a complete end-to-end test of every product feature.

## Direction and tradeoffs

Three approaches were considered:

| Approach | Benefit | Tradeoff |
| --- | --- | --- |
| Reproduce the broad Explore catalogue | Immediate resemblance and lots of visual content | Too much navigation and too many incomplete destinations for one day |
| Focus on a workspace and project studio | Strong visual identity, useful persistent flows, clear tenant context | Fewer features represented, each needs to work well |
| Build a cinematic promotional page first | Fast visual impact | Provides little evidence of application engineering |

Use the workspace and project studio approach. It serves the user's backend strengths and gives us a real surface for later creative features. A compact public introduction can use an editorial media composition, but the working application should receive most of the effort.

## Decisions we are making

| Reference behavior | Our decision | Why |
| --- | --- | --- |
| Numerous top-level tools, studios, models, and promotions compete in navigation | Show only implemented destinations; start with Projects and workspace/account controls | Navigation should predict what a user can actually do |
| Several marketing questions precede creation | Keep initial setup to authentication and workspace selection or creation | Reach useful work sooner |
| Cinematic controls open from compact groups | Preserve progressive disclosure for future advanced settings | Let beginners start without hiding depth from experienced users |
| Sale strip, model promotions, and upgrade notices occupy the studio | Use contextual availability messages beside relevant actions | Preserve the workspace for creation and review |
| One inspected canvas route blocks mobile access | Support the foundation's auth and project flows at phone widths | A reviewer should be able to use the live link from any common device |
| Large model catalogue | Show only genuinely supported capabilities when features are selected | A clear limitation is more useful than an impressive but misleading selector |

These decisions are hypotheses grounded in observation, not claims backed by usability studies. Record later changes and their reasons in a short decision log.

## Visual language

Use near-black backgrounds, layered charcoal surfaces, light text, and one electric lime action color. Media should provide most of the color variety. Favor precise spacing, quiet borders, short labels, and strong composition over decorative widgets. Give the application its own wordmark and product name; a working name can be changed from one configuration value. Do not reproduce Higgsfield logos, sale claims, community statistics, or testimonials.

Reserve expressive typography for the public introduction and major empty states. Keep project lists, forms, navigation, and account controls compact and readable. Avoid turning the shell into a generic dashboard full of metrics: this product is a studio, so project thumbnails, titles, and useful actions carry the hierarchy.

## Color tokens

The original sampled body background was `#0F1113`, body text `#F7F7F8`, and promotional lime `#D1FE17`. The rest of this table defines our proposed tokens.

| Token | Value | Usage |
| --- | --- | --- |
| `background` | `#0F1113` | Page and large workspace |
| `surface` | `#171A1D` | Sidebar, cards, inputs |
| `surface-raised` | `#202428` | Menus, dialogs, hover surfaces |
| `surface-selected` | `#2A3035` | Selected navigation or settings |
| `border` | `#30363D` | Quiet structural separation |
| `border-strong` | `#697580` | Input and control boundaries requiring clear contrast |
| `text` | `#F7F7F8` | Main text |
| `text-secondary` | `#B4BAC2` | Descriptions and helper text |
| `text-muted` | `#929BA5` | Secondary metadata |
| `accent` | `#D1FE17` | Primary CTA, focus, selected accent |
| `accent-hover` | `#E0FF58` | Primary CTA hover |
| `accent-ink` | `#151A06` | Text on lime |
| `success` | `#86D9A2` | Confirmed completion |
| `warning` | `#F1C675` | Recoverable issue or quota message |
| `danger` | `#FF9292` | Errors and destructive confirmation |

Measured solid-color contrast is 17.67:1 for main text on background, 8.94:1 for secondary text on surface, 5.54:1 for muted text on raised surface, and 15.14:1 for accent ink on lime. This does not prove accessibility of translucent overlays, media backgrounds, disabled states, or every combination. Check those in the rendered application. Quiet structural borders are not substitutes for visible input boundaries and focus indicators.

## Typography and geometry

Use Inter for application text and Space Grotesk for display headings, with system fallbacks. These families were observed in the original. Bundle through the framework's font support or self-host with the appropriate license. Limit weights to those actually used.

| Role | Desktop size / line height | Weight |
| --- | --- | --- |
| Public display | 48–56 / 56–64 px | 600–700 |
| Mobile display | 32 / 38 px | 600–700 |
| Page title | 28 / 36 px | 600 |
| Section title | 20 / 28 px | 600 |
| Body | 14 / 22 px | 400 |
| Navigation and controls | 14 / 20 px | 500 |
| Metadata | 12 / 18 px | 400–500 |
| Mobile text inputs | At least 16 / 24 px | 400 |

Use a 4 px spacing base: 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64. Set controls to 40 px standard height, with 44 px touch targets where needed. Use 8 px radii on small controls, 12 px on cards and panels, 16 px on dialogs and major media containers. Pill shapes are suitable for a tag or small switch, not every surface. Use a single consistent icon set, generally 18–20 px, with named accessible controls.

## Layout rules

The public page should have a concise headline, a primary entry action, and a small selection of legitimate media. It must open without authentication. It should explain the application's actual current capability and identify it as an independent assignment project without suggesting affiliation.

The desktop application uses a roughly 232 px sidebar, a 56 px topbar, and a flexible main area. Put the workspace switcher near the top of the sidebar and account controls near the bottom. The topbar contains the page title and actions for that page. Avoid duplicating the same action in three places. Project content starts with 24–32 px padding and a readable maximum width; later media feeds can use the remaining width.

Start the foundation with Projects, a project detail view, and workspace settings available through Clerk components. A project detail page can hold a title, description, and room for the later creation surface. A lightweight project description is sufficient now; a rich document editor and canvas are later scope decisions.

At widths below roughly 1024 px, reduce sidebar width or collapse it into a drawer. Below roughly 768 px, stack the content and make the sidebar a labeled menu. Dialogs fit within the viewport and may become sheets. Forms, project cards, and workspace controls must remain usable at 390 px and 320 px. No desktop-only barrier for the foundation. Keep focused fields visible above the software keyboard.

When the creation composer is added later, desktop can use a docked bottom surface like the reference. Leave sufficient content padding so it never hides results. On phones, favor a normal-flow or compact expandable composer instead of a tall fixed panel consuming the entire screen. Do not add an inactive composer to the foundation just to resemble the original.

Use three layout patterns as the product expands: project studio with a central composer, a tool form beside its preview/history, and an editorial entry for a workflow requiring source media. Share tokens and components between them, while letting the task determine the composition. A text-to-speech tool and a filmmaking project do not need identical layouts to feel like the same product.

The effects picker shows a useful principle: selecting a capability changes its inputs. Future generation controls should come from a typed capability definition with supported inputs, bounds, output types, and availability. Hide irrelevant settings rather than showing controls that will be ignored. Keep the exit from a full-screen tool visible; the inspected canvas places it inside a menu, and our version can make it more direct.

## Component behavior

| Component | Required behavior |
| --- | --- |
| Primary button | One dominant action per context; loading retains width and announces state; duplicate submission prevented |
| Secondary button | Quiet surface with clear border or hover change; never competes with the main action |
| Destructive action | Specific verb and affected item; confirmation for irreversible or broad changes |
| Input | Persistent label, associated helper/error, clear focus ring, validated bounds |
| Dialog | Accessible title, focus trap, Escape where safe, returns focus to trigger |
| Menu | Keyboard navigation, named trigger, selected state conveyed beyond color |
| Toast | Supplemental confirmation; important errors also appear where recovery happens |
| Project card | Title, honest thumbnail or designed fallback, updated time; navigation and menu use separate controls |
| Workspace switcher | Active workspace always visible; pending switch blocks stale mutations |
| Empty state | Explain what belongs here and give one useful next action |

Use Clerk's supported components and appearance configuration for authentication and organization management. Surround them with our layout and typography. A bespoke authentication protocol or imitation social-login button would add risk without improving the assignment.

## Screen states

Design signed-out entry, auth loading, signed-in/no-workspace, workspace loading, empty projects, populated projects, project loading, invalid form input, unavailable project, failed save, and success. Avoid flashing a previous workspace's project list during a switch. An unavailable project should use the same friendly explanation for a missing resource and an inaccessible one.

Preserve input after a recoverable save failure. Show a retry next to the failed action, with enough explanation to act. A missing service configuration is an operational error, not a successful demo result. At this stage, mention creative features as upcoming only where useful; do not ship a sea of disabled tabs.

For later generation, distinguish queued, running, successful, failed, and canceled states. Show exact availability and any quota before submitting. A progress bar must correspond to measured progress; otherwise use a state indicator. Keep user drafts recoverable. These are requirements for the later feature decision, not work to add automatically to the foundation.

## Motion

Observed navigation styles used approximately 200 ms transitions. Our proposed motion is restrained: 120 ms for hover and press feedback, 180 ms for menus and dialogs, 220 ms for drawers and meaningful layout changes. Animate opacity and small transforms rather than widths across the whole interface. Dialog entry can use 4–8 px vertical movement and a subtle fade. Hover on a project card may lift it 2 px; it must not move adjacent cards.

Use motion to communicate continuity, selection, and completion. Avoid looping shimmer after content loads, cursor effects, noisy backgrounds in forms, and page-wide animations on every click. Honor `prefers-reduced-motion`: remove decorative transforms, animated media previews, and autoplay; preserve immediate state feedback. Do not autoplay audio. Poster images and a play action should make video understandable before it runs.

## Media, performance, and authenticity

Use original or appropriately licensed media, with provenance recorded. Research screenshots belong in documentation, not production hero artwork. An asset library with no user work should be genuinely empty; curated samples must be clearly labeled and kept distinct from private projects.

Reserve media dimensions to prevent layout jumps. Use responsive image sizes and lazy loading below the first screen. Render a useful poster when video fails. Keep fonts, animations, and client-side code small enough that auth and project navigation remain responsive on a modest connection. Never use a remote thumbnail URL to expose private user content.

## Review criteria

The foundation is visually ready when a fresh signed-out visitor understands the entry action, Clerk flows fit the brand, the active workspace is unambiguous, projects feel like a creative studio, and loading/error/empty states look intentional. Review desktop and mobile screenshots, keyboard navigation, focus states, contrast, and reduced motion. Record what was actually checked.

The full assignment is ready only after the selected creative workflow works, deployment and CI are verified, capture logs are committed throughout development, and the public repository and walkthrough satisfy [brief.md](../brief.md). A polished foundation is an intermediate milestone.
