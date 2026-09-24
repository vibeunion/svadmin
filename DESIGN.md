---
version: "alpha"
name: "svadmin Admin UI"
description: "A restrained, precise Stripe-inspired product interface for repeated administrative work."
colors:
  background: "#f6f9fc"
  foreground: "#0a2540"
  surface: "#ffffff"
  surface-subtle: "#f1f4f8"
  muted-foreground: "#425466"
  border: "#e6ebf1"
  primary: "#635bff"
  on-primary: "#ffffff"
  success: "oklch(0.51 0.16 151)"
  warning: "oklch(0.7 0.15 75)"
  danger: "oklch(0.58 0.22 27)"
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0px"
  heading:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
  surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  surface-subtle:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    typography: "{typography.body}"
  divider:
    backgroundColor: "{colors.border}"
    height: "1px"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  status-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  page-heading:
    textColor: "{colors.foreground}"
    typography: "{typography.heading}"
---

## Overview

### Visual update: September 23, 2026

The current UI follows a Stripe-inspired and corporate-clean visual direction:
neutral canvas, Stripe purple as the single action accent, hairline borders,
layered but restrained shadows, a subtle technical grid on the work canvas, and
short ease-out feedback for interactive controls. This supersedes the older
capability-only reference limitation below.
Keep SVAdmin's own branding, semantic tokens, OpenUI contracts and Bits UI behavior.
App chrome must use explicit anatomy hooks; never style every business `header`.
Package utilities live in sublayers of `utilities`, so host-authored responsive
utilities win regardless of lazy package stylesheet load order.

svadmin defines its own Admin UI product language: quiet neutral canvases, precise
type, hairline borders, restrained elevation, compact controls, and clear
feedback for repeated operational work. The interface should feel like a real
administrative product with trustworthy states, not a collection of dashboard
templates.

Metronic is a capability reference only. Its page families, information
architecture, and scenario coverage may expose missing components or examples,
but its palette, decoration, card treatment, typography, and branding are not
visual authority. Fuse, Midone and Skote are also reference-only sources for
spacing and component anatomy; their template branding and decorative treatment
must not enter the product.

### Reference integration and precedence

The supplied references are intentionally assigned different jobs so they do
not become a mixed visual theme:

| Reference | Adopted responsibility | Explicitly excluded |
| --- | --- | --- |
| Stripe style prompt | `#635bff` action accent, technical grid, hairline borders, layered elevation, lift/depress feedback | Stripe brand assets, marketing gradients, oversized hero treatment |
| Corporate-clean prompt | neutral enterprise surfaces, readable hierarchy, generous spacing, focus-ring offset, motion capped at 200ms | blue-only palette, rigid utility-class recipes, decorative cards |
| Fuse / Midone / Skote | navigation anatomy, page-family coverage, toolbar/table/form composition, density observations | vendor palette, logos, fonts, CSS, copied markup or component chrome |
| svadmin | semantic tokens, component API, state ownership, accessibility, responsive contracts | no second visual authority |

When references conflict, svadmin semantics and accessibility win first, the
Stripe prompt controls the action accent and grid, and the corporate-clean
prompt controls restraint, spacing, and motion limits. The result is one
product language rather than a collage of template styles.

### Runtime integration map

The same contract is used at every delivery surface:

- `packages/ui/src/app.css` owns published semantic tokens and the
  `clean-flat + stripe` refinement; host applications consume this stylesheet.
- `packages/core/src/theme.svelte.ts` owns the `stripe` color preset and mode
  attributes; it must stay aligned with the CSS fallback values.
- `AdminApp` supplies `clean-flat` as a fallback layout without taking over an
  explicit theme owner. Core supplies the default Stripe color and preserves
  saved user selections; `layoutPreset: 'default'` remains an explicit opt-out.
- `example/src/App.svelte` consumes these defaults without repeating theme
  configuration. A bare `AdminApp` renders `ResourceOverview` on its home route.
- `DashboardPage`, `PageSection`, `WorkspaceLayout`, and the content components
  own reusable page composition in the published UI package. Example modules
  own business queries and decisions, not private replacements for these layouts.
- `packages/create-svadmin/template` starts new projects with the same theme
  and guidance document, so generated apps do not drift from the example.
- `design/admin-ui/preview` renders the published package CSS and uses the same
  Stripe preset for component and state review.
- `packages/flow` resolves explicit flow overrides first, then host semantic
  tokens, then standalone Stripe-compatible fallback colors.
- `packages/editor`, `packages/surface`, and `packages/ai-elements` consume
  complete CSS color tokens, not HSL channel tuples. Independent stylesheets
  use motion-token fallbacks so they also work without the full UI package.
- `packages/lite` mirrors the palette with literal colors. Its legacy-browser
  contract deliberately excludes custom properties and modern selectors;
  visual alignment must not remove that compatibility.

Theme refinements must preserve component density, invalid and selected states.
Focus belongs to the active control, not every enclosing card. Search icons and
clear actions use logical positioning so the same layout works in RTL.

Settings pages use `ContentPageHeader` with one page-level `h1`. When embedded
inside another page, pass `headingLevel="h2"` and use `h3` for nested
`SettingsGroup` headings. `SettingsFieldRow.controlId` associates the visible
label with its native control; IDs must be unique per component instance.
Segmented settings expose their selected option with `aria-pressed`, retain
their value after reload, and normalize unsupported persisted values.
Invalid fields expose `aria-invalid` and associate the visible error through
`aria-describedby`; valid sibling fields stay neutral. Clearing an error also
removes its association. Verify label activation with two mounted instances,
not only matching label text. Provider-backed settings retain their disabled
state when no provider is configured; demo screenshots are not persistence
evidence.

Do not add page-local palettes or shadow values when a semantic token exists.
If a new reference suggests a different treatment, record its responsibility
here before changing runtime CSS.

### Design principles

Seven principles turn svadmin's design direction into reviewable product
decisions. They apply to built-in components, examples, generated applications,
and documentation:

1. **Clear by default:** every page has one primary job, one dominant next
   action, and one owner for every visible fact. Supporting copy adds a
   constraint, consequence, scope, or recovery path instead of repeating UI.
2. **Efficient in the loop:** preserve filters, selection, navigation context,
   and keyboard reachability across repeated work. Loading and feedback must not
   move the primary action or force an unnecessary page transition.
3. **Consistent by contract:** semantic tokens, component variants, state names,
   page skeletons, and feedback lifecycles remain stable across products. Layout
   presets may change density and composition, not interaction meaning.
4. **Trustworthy in every state:** loading, empty, partial, error, forbidden,
   destructive, reversible, and completed states expose their scope and next
   step. Data freshness, permission boundaries, and action consequences must be
   visible when they affect a decision.
5. **Restrained by purpose:** neutral surfaces and precise hierarchy carry the
   interface. Accent, elevation, radius, animation, and decoration are used only
   when they clarify priority or interaction.
6. **Accessible by construction:** keyboard access, visible focus, semantic
   structure, non-color status cues, readable contrast, stable targets, and
   responsive behavior are component defaults rather than page-level repairs.
7. **AI-ready and auditable:** generated UI declares its primary workflow,
   information owners, state owners, and feedback removal conditions; it uses
   the trusted component catalog and passes deterministic and visual gates.

Use these principles as an ordered review: first verify the task and state are
clear, then efficiency and consistency, then trust, restraint, accessibility,
and generation evidence. A visually polished page still fails when its state or
action ownership is ambiguous.

## Colors

Neutrals carry the interface. Primary is a single controlled interaction accent,
not a page background. Success, warning, and danger are reserved for semantic
status and feedback. Consumer themes may replace the primary hue while keeping
the neutral hierarchy and contrast relationships intact.

The reference Stripe preset uses `#635bff`, `#0a2540`, `#f6f9fc`, and
`#e6ebf1`. The grid is a low-contrast canvas texture only; buttons and data
surfaces remain solid, and gradients are not used to communicate status. The
runtime names for the shared depth and motion tokens are
`--svadmin-shadow-control`, `--svadmin-shadow-surface`,
`--svadmin-shadow-surface-hover`, `--svadmin-motion-fast`,
`--svadmin-motion-standard`, `--svadmin-motion-slow`, and
`--svadmin-focus-offset`.

- **WCAG 2.2 AA Contrast**: Normal text maintains at least 4.5:1 against its
  canvas; large text, icons, and focus rings maintain at least 3:1. Enhanced AAA
  screens target 7:1 for normal text.
- **Palette Discipline**: Avoid one-note palettes dominated by a single hue
  family. Functional states (success, warning, destructive) must use distinct
  chroma and hue angles, never tints of the primary accent.

## Typography

Use a compatible system sans. Product pages use compact
headings and normal letter spacing. Uppercase table labels, negative tracking,
and oversized dashboard numerals are not defaults.

- **Tabular Figures**: All data tables, numeric metrics, counters, and
  timestamps use `tabular-nums` (monospaced figures) to guarantee stable column
  alignment and avoid visual jitter during live updates.

## Layout

Use an 8px spacing rhythm with 4px for tight internal alignment. Pages are
unframed layouts with a stable content width. Cards represent individual
objects or bounded tools; page sections are not decorative floating cards and
cards are not nested for visual effect.

### Visual Density Dials

svadmin components support systematic density levels to balance scanning speed
and operational throughput:

- **Density 8–10 (Dense / Dashboard)**: 2px/4px/8px rhythm with 28px–32px row
  heights. Used for `AutoTable`, `FilterToolbar`, `RecordDetailDrawer`, and
  operations work areas.
- **Density 4–6 (Comfortable / Standard)**: 4px/8px/16px rhythm with 40px–44px
  control heights. Used for settings forms, account profiles, and overview cards.
- **Density 1–3 (Spacious / Onboarding)**: 16px/24px/32px rhythm for public
  portals and introductory workflows.

## Elevation & Depth

Surfaces use a one-pixel border plus a subtle two-layer shadow. Hover elevation
may increase slightly for genuinely clickable items, without translation or
glow. Dialogs and menus receive stronger depth because they are floating
layers. Dark mode keeps the same hierarchy with low-chroma surfaces.

- **Control Shadow**: `0 1px 2px rgb(15 23 42 / 0.04), 0 0 0 1px rgb(15 23 42 / 0.02)`
- **Surface Shadow**: `0 1px 3px rgb(15 23 42 / 0.04), 0 4px 8px rgb(15 23 42 / 0.04)`
- **Surface Hover Shadow**: `0 2px 4px rgb(15 23 42 / 0.06), 0 6px 12px rgb(15 23 42 / 0.06)`
- **Overlay Shadow**: `0 20px 52px rgb(15 23 42 / 0.18), 0 6px 16px rgb(15 23 42 / 0.1)`

## Shapes

Controls use 8px radii and bounded surfaces use 8px radii. Pills are limited to
status badges, avatar groups, and controls whose geometry carries meaning.

## Components

Buttons, fields, tabs, tables, badges, empty states, skeletons, alerts, and
feedback use shared components and semantic tokens. Layout presets may adjust
density and composition, but they must not replace component color, typography,
focus, or elevation with hard-coded values.


## Micro-interactions & Motion

Transitions provide clear state confirmation without delaying user action:

- **Timing**: Micro-transitions use 150ms–200ms with `ease-out`; never use
  `ease-in-out` for routine controls.
- **Feedback**: Enabled buttons may lift by 2px on fine-pointer hover and
  depress to `scale(0.98)` on press. Neither transform runs with reduced
  motion. Interactive cards change border and shadow only, without moving.
  Disabled controls never lift or depress.
- **Focus Rings**: Operable controls declare `:focus-visible` with a 2px solid
  ring and a 2px offset.
- **Accessibility**: All transitions and keyframe animations collapse to 0.01ms
  when `prefers-reduced-motion: reduce` is active.
- **Accessible Authentication & OTP**: One-time passwords, 2FA codes, and
  security tokens must support multi-digit paste distribution, keyboard navigation,
  and `autocomplete="one-time-code"` without cognitive barriers (WCAG 2.2 AA).
- **Destructive Action Defenses**: Irreversible operations (such as deleting
  records or revoking keys) require confirmation with clear loading states and
  accidental submission defense.

### Reference responsibilities

The reference stack is layered. It is not a visual mixture:

- **svadmin owns its visual principles:** hierarchy, restraint, neutral surfaces,
  typography, density, and interaction tone.
- **Refine is an application-model reference:** resource routing, CRUD flows,
  provider state, access control, and mutation ownership.
- **Ant Design is a behavior reference:** field validation, alerts, messages,
  notifications, results, empty states, loading, and high-density data tasks.
- **shadcn/ui is a composition reference:** accessible primitives, source-owned
  components, semantic tokens, variants, and AI-readable assembly patterns.
- **Carbon and PatternFly are enterprise-pattern references:** notification
  lifecycle, inline versus global feedback, empty/error states, and operational
  page composition.
- **Metronic is a coverage reference:** page families and missing scenarios only.

Never copy a reference library's palette, radius, elevation, marketing layout,
or component chrome without an explicit svadmin design decision.

### Page hierarchy and information budget

Every page must have one primary job and one dominant next action. Before adding
content, identify the page's primary workflow, current unresolved state, data
state, and action owner.

- From the page header through the primary work area, allow at most one
  full-width, high-emphasis persistent feedback surface.
- Explanatory copy must add a constraint, consequence, scope, or recovery path.
  It must not paraphrase the heading, field label, button, badge, or data below.
- A fact or count already visible in a filename, badge, table, progress state,
  or summary has one owner and is not repeated in another banner or paragraph.
- Use a page section only when it groups a real task or bounded data set. Do not
  create an informational section solely to describe the surrounding UI.
- A feedback surface has at most one primary action. Additional recovery paths
  belong in the destination workflow, menu, or supporting text.

### Feedback hierarchy

The invariant is: **one event -> one primary feedback surface**.

| Event | Primary surface | Lifecycle |
| --- | --- | --- |
| Invalid field or field-specific server error | Inline field message | Until corrected |
| Successful mutation with no next action | Toast | 3 seconds |
| Success that changes the page into a completed state | New page/local state; disable the automatic Toast | Until navigation or a new task |
| Unresolved partial result or required user action | `FeedbackNotice` warning | Until resolved |
| Blocking failure, permission boundary, or unavailable workflow | `FeedbackNotice` danger or error state | Until resolved or dismissed |
| Non-blocking policy or scope context | `FeedbackNotice` info | While context remains relevant |
| Reversible mutation | Undoable Toast | Exactly the undo window |

Success is never a persistent page-level banner. `FeedbackNotice` intentionally
has no success tone. A successful event must not simultaneously occupy a Toast,
heading, description, Alert, status badge, and data summary. When a page owns a
completed state, disable hook-level success notification with
`successNotification: false` on the owning hook or form.

Toasts are collapsed by default, limited to three visible items, and keyed by
event identity when duplicate delivery is possible. A key represents one event,
not a message string. Errors may remain longer than success, but persistent
errors must expose a recovery path or a dismiss action.

### AI generation contract

Before accepting an AI-generated application page, verify all of the following:

1. The page has one explicit primary workflow and the main action is visible.
2. Every heading, description, notice, metric, badge, and table has unique
   information ownership.
3. Loading, empty, partial, error, permission, and success states use the
   feedback hierarchy above.
4. Ordinary success uses a Toast; state-transition success uses the new state;
   the two are never emitted for the same event.
5. The first viewport contains no nested cards, decorative explanation panels,
   or more than one persistent high-emphasis notice.
6. Desktop and mobile screenshots show no overlap, clipping, horizontal scroll,
   or action displacement caused by feedback content.

## Do's and Don'ts

- Do keep hierarchy quiet, dense, aligned, and easy to scan repeatedly.
- Do show loading, empty, error, permission, progress, and mutation feedback.
- Do preserve visible keyboard focus and at least 44px coarse-pointer targets.
- Do remove, downgrade, or relocate feedback as soon as its state is resolved.
- Don't copy Metronic colors, decorative treatment, or template branding.
- Don't repeat a success fact across Toast, title, description, banner, badge,
  and table data.
- Don't use persistent success banners for routine mutations.
- Don't use decorative gradients, glow, glassmorphism, negative letter spacing,
  or blanket `!important` overrides as the default product language. A subtle
  two-line grid is allowed on the work canvas because it is part of the current
  Stripe-inspired reference direction.
- Don't use cards inside cards or make every section a floating card.
