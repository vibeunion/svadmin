---
version: "alpha"
name: "svadmin Admin UI"
description: "A neutral admin interface for repeated operational work, implemented with svadmin tokens and shadcn-svelte."
colors:
  background: "#F7F8FA"
  foreground: "#1D2129"
  surface: "#FFFFFF"
  surface-subtle: "#F2F3F5"
  muted-foreground: "#4E5969"
  border: "#E5E6EB"
  secondary: "#F2F3F5"
  accent: "#E8F3FF"
  accent-foreground: "#0E42D2"
  input: "#E5E6EB"
  sidebar: "#FFFFFF"
  sidebar-foreground: "#4E5969"
  primary: "#165DFF"
  on-primary: "#FFFFFF"
  success: "#00B42A"
  warning: "#FF7D00"
  danger: "#F53F3F"
typography:
  body:
    fontFamily: "\"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0px"
  label:
    fontFamily: "\"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0px"
  heading:
    fontFamily: "\"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0px"
rounded:
  sm: "2px"
  md: "4px"
  lg: "4px"
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

### Visual update: October 29, 2026

svadmin is the primary design system. The default canvas, type, radius,
elevation, and action color follow The published light and dark ramps:
page background `#F7F8FA`, ink `#1D2129`, hairline `#E5E6EB`, and a single
primary action color `#165DFF`. The same page patterns cover list,
grouped form, detail, and result pages. shadcn-svelte remains the component
implementation. This supersedes the Stripe-inspired default below.
Keep SVAdmin's own branding, semantic tokens, OpenUI contracts and Bits UI behavior.
Do not install a second component runtime or a second component runtime.
App chrome must use explicit anatomy hooks; never style every business `header`.
Package utilities live in sublayers of `utilities`, so host-authored responsive
utilities win regardless of lazy package stylesheet load order.

svadmin defines its own Admin UI product language: quiet neutral canvases, precise
type, hairline borders, restrained elevation, compact controls, and clear
feedback for repeated operational work. The interface should feel like a real
administrative product with trustworthy states, not a collection of dashboard
templates.

For business workflow, page selection, list density, operation ownership, and
acceptance gates, read `docs/ENTERPRISE_PRODUCT_SYSTEM.md`. This document is
the product-usage layer above the visual system: it explains how to use the
published components to build useful enterprise workflows instead of treating
the component catalog as a page design.

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
| svadmin | default palette, 14px type, 2px/4px radius, neutral surfaces, component behavior for table, form, descriptions, upload, and feedback | a second component runtime, theme packages, or stock illustrations |
| page patterns | list, grouped form, detail, and result page anatomy | another shell, a dashboard card wall, or route-meta permissions |
| shadcn/ui | source-owned components, semantic tokens, variants, and accessible composition | a second runtime or an unconstrained page skin |
| Stripe style prompt | optional `stripe` accent preset only: chip `#635bff`, painted `oklch(0.54 0.24 293)` | default canvas, default primary, technical grid, Stripe brand assets |
| Fuse / Midone / Skote | scenario coverage only | vendor palette, logos, fonts, CSS, copied markup or component chrome |
| svadmin | semantic token names, component API, state ownership, accessibility, responsive contracts | a second visual authority |

When references conflict, svadmin accessibility and state contracts win first,
then the default ramp and page patterns. Stripe is no longer the default visual.
The result is one product language rather than a collage of template styles.

## Component contract

svadmin is the component specification. shadcn-svelte
is the only implementation. Do not add a second component runtime. A specified component
is either mapped below or implemented with the same tokens. A component the specification does
not define still follows this contract: 32px controls, 2px control radius, 4px
surfaces, one primary action color, semantic status colors, labels above fields,
and one feedback surface per event.

| Specified component | svadmin implementation |
| --- | --- |
| Button, Input, Select, Textarea, Checkbox, Switch, Radio, Slider | shadcn primitives, 32px size and 2px focus ring |
| Tag, Badge | `Badge` light tag |
| Table, Form, Descriptions, Upload, Steps | `AutoTable`, `AutoForm`, `DescriptionList`, `FileUpload`, `StepsForm` |
| Link, Typography | `Link`, `Title`, `Text` |
| Divider | `Divider` (`Separator`) |
| Empty, Result, Spin, Skeleton | `EmptyState`, `Result`, `Spin`, `Skeleton` |
| Message, Notification, Alert, Modal, Drawer, Popconfirm | `Toast`, `FeedbackNotice`, `Dialog`, `Sheet`, `Popconfirm` |
| List, Tree, BackTop | `ItemList`, `Tree`, `BackTop` |
| Date/Time, Cascader, TreeSelect, Transfer, Mentions, Upload | existing field components |

Components outside that table, including workspace, approval, kanban,
gantt, audit, and resource pages, are not a second design system. They use the
same semantic tokens, control height, radius, status colors, and field error
placement. They do not introduce a new palette, a technical grid, a solid
default badge, or a success banner plus a success toast.

Detail rules for every component:

- Default control height is 32px. Small is 28px. Large is 36px.
- Controls use a 2px radius. Bounded surfaces use 4px.
- Focus is a 2px primary-tinted ring on the control, not on the surrounding card.
- Table head and row are 40px. The head uses the canvas color and secondary text.
- A required mark is `danger`. The error sits directly under its field.
- Status is never color alone. Extra components use `success`, `warning`, and
  `danger` tokens only for status.

### Runtime integration map

The same contract is used at every delivery surface:

- `packages/ui/src/app.css` owns published semantic tokens and the
  `clean-flat + arco` refinement; host applications consume this stylesheet.
- `packages/core/src/theme.svelte.ts` owns the `arco` color preset and mode
  attributes; it must stay aligned with the CSS fallback values. `stripe`
  remains an optional preset.
- `AdminApp` supplies `clean-flat` as a fallback layout without taking over an
  explicit theme owner. Core supplies the default color and preserves
  saved user selections; `layoutPreset: 'default'` remains an explicit opt-out.
- `example/src/App.svelte` consumes these defaults without repeating theme
  configuration. A bare `AdminApp` renders `ResourceOverview` on its home route.
- `DashboardPage`, `PageSection`, `WorkspaceLayout`, and the content components
  own reusable page composition in the published UI package. Example modules
  own business queries and decisions, not private replacements for these layouts.
- `packages/create-svadmin/template` starts new projects with the same theme
  and guidance document, so generated apps do not drift from the example.
- `design/admin-ui/preview` renders the published package CSS and uses the same
  default preset for component and state review.
- `packages/flow` resolves explicit flow overrides first, then host semantic
  tokens, then standalone fallback colors.
- `packages/editor`, `packages/surface`, and `packages/ai-elements` consume
  complete CSS color tokens, not HSL channel tuples. Independent stylesheets
  use motion-token fallbacks so they also work without the full UI package.
- `packages/lite` mirrors the default palette with literal colors. Its legacy-browser
  contract deliberately excludes custom properties and modern selectors;
  visual alignment must not remove that compatibility. Its literal accent
  is the same `#165DFF` primary used by `@svadmin/ui`.

Theme refinements must preserve component geometry, invalid and selected states.
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
   presets may change composition, not interaction meaning.
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

**The Token Source Rule.** Frontmatter neutrals are the light values of
`.layout-clean-flat[data-theme="arco"]` in `packages/ui/src/app.css`. The
painted action color is `--primary: #165DFF` from `:root` and
`[data-theme="arco"]`, matching `builtinPresets.arco.light` in
`packages/core/src/theme.svelte.ts`. The preset menu chip
`builtinPresets.arco.color` is the same `#165DFF`. It is not a second primary.

Canvas neutrals in that block are `#F7F8FA`, `#1D2129`, `#FFFFFF`,
`#F2F3F5`, `#4E5969`, and `#E5E6EB`. Success, warning, and danger stay on the
semantic tokens: `--success: #00B42A`, `--warning: #FF7D00`,
`--destructive: #F53F3F`. Do not mix the optional Stripe canvas into the
default theme.

Dark mode for the default preset replaces the canvas and lifts the accent to
The dark primary:

| Token | Dark value |
| --- | --- |
| background | `#17171A` |
| foreground | `#E6E6E6` |
| card / popover | `#232324` |
| muted | `#2A2A2B` |
| muted-foreground | `#B3B3B3` |
| border | `#484849` |
| sidebar | `#17171A` |
| primary | `#3C7EFF` |
| on-primary | `#FFFFFF` |

Named color themes (`neutral`, `indigo`, `blue`, `green`, `rose`, `orange`,
`violet`, `stripe`) replace primary, ring, sidebar-primary, and chart-1 only.
They do not rebuild the neutral ramp. `arco` is the default preset id and paints
the full ramp above.

The grid is a low-contrast canvas texture only; buttons and data
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

### Spacing Rhythm

svadmin components ship one comfortable baseline rhythm so pages scan
consistently and generated output matches hand-built pages:

- **Components**: 4px/8px/16px rhythm with 40px–44px control heights and
  40px–44px table row heights, used across `AutoTable`, `FilterToolbar`,
  `RecordDetailDrawer`, forms, and operations work areas.
- **Spacious onboarding or marketing surfaces** may widen vertical padding with
  page-local layout choices, but must not fork component recipes.

Density is not a component or page-pattern option; there is no compact or
comfortable modifier to coordinate across `AutoTable`, `ContentPageShell`, or
Surface widgets.

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

### Page pattern assembly

First select the existing page family. Resource-backed CRUD must keep
`ListPage`, `CreatePage`, `EditPage`, and `ShowPage`: these own permissions,
queries, navigation guards, and mutations. Never wrap these full pages inside
another titled page shell. Keep `DashboardPage` for existing dashboards.

Use `PagePattern` for custom business compositions that do not fit those
resource routes. It supplies layout only, not querying, permissions, form
submission, or business data fetching. It owns the default page-state
presentation so custom pages do not need to recreate loading/error/empty
layouts:

- `list`: comfortable title, toolbar, table/list content, and list empty states.
- `form`: narrow reading width, comfortable grouped fields and a single save area.
- `detail`: read-only summary and related content.
- `workspace`: comfortable primary work area plus an optional secondary panel.
- `dashboard`: wide layout with optional metrics and secondary context.

Set `state` to `loading`, `empty`, `filtered-empty`, `error`, or `forbidden`
while the page is not ready. Use `empty` only when the underlying collection is
empty; use `filtered-empty` when filters excluded all records. Page content is
hidden during those states, and the shared `DataState` component supplies the
accessible default. Use `retry` only for `error`; use `stateAction` for an
explicitly permitted next step. `ready` is the default.

Optional `secondary` content renders beside the primary content for every kind.
For advanced resizable, collapsible, or independently scrolling work areas,
compose `WorkspaceLayout` or `MasterDetailView` directly. The pattern does not
replace those interaction contracts.

The pattern supplies the page shell and named composition regions. The caller
supplies business data, permissions, mutations, and state-specific content.
Do not recreate these page families with arbitrary nested cards or repeated
gray title bars.

| Workflow | First choice | Business-owned state |
| --- | --- | --- |
| Resource list | ListPage | Resource contract and access policy |
| Create/edit | CreatePage / EditPage | Validation and mutation result |
| Resource detail | ShowPage | Resource contract and related records |
| Settings | ConfigurationPage + SettingsGroup | Dirty/pending/success/error |
| Custom list/form/detail | PagePattern | Query, access, validation, pagination |
| Master/detail | PagePattern + MasterDetailView | Selection and scope changes |
| Approval | ApprovalCenter / ApprovalActionCard | Authorization and decision result |
| Dashboard | DashboardPage | Real metrics and drill-down destinations |
| Audit log | SecurityLogPage / AuditLogViewer | Permission, time range, pagination |

Acceptance scenarios for every custom page:

- Given a populated page with long business labels, when rendered in a narrow
  or wide container, then content wraps without hiding controls or overflowing.
- Given an empty collection, when filters are absent, then show an initial-empty
  message; when filters exclude records, show no-results and an available reset.
- Given a failed request, when retry is selected, then rerun the query without
  displaying stale content as current or suggesting the request succeeded.
- Given a denied operation, when rendering actions, then omit/disable the
  operation according to policy; a layout component never grants permission.
- Given form edits, when saving fails, then retain the edits and show one
  actionable error; show success only after confirmed persistence.

### Configuration page assembly

For configuration workflows, start with `ConfigurationPage`, then compose
`SettingsGroup` and `SettingsFieldRow`. Do not recreate the page shell using
cards, repeated title bars, or unrestricted two-column fields.

- Use one page title and group related settings under descriptive headings.
- Connect each field label to its control through `controlId`.
- Put one transaction's save/reset controls in the `footer` snippet. For
  independently saved sections, use each group's `actions` instead; do not
  duplicate the same save command in both places.
- The caller owns dirty, pending, success, validation, and failure states.
  Disable duplicate submissions while pending. Only show success after the
  persistence request succeeds; preserve edits after failure.
- Separate initial-empty content from filtered-no-results content. Offer
  creation only when permitted, and clearing filters only when filters exist.
- Page patterns use a single comfortable baseline so generated and custom pages
  share the same rhythm across forms, detail, list, and workspace families.
- Reference `packages/ui/stories/ConfigurationExample.svelte` in the SVAdmin
  source for a working composition; its save action is in-memory demo state,
  not a persistence implementation.

Before generating a page, select the existing page family (list, configuration,
detail, or workspace), identify its primary action, and reuse its components.
Verify populated, empty, loading, and failed states with realistic long labels.
Inspect rendered alignment, overflow, duplicate headings, and excessive space;
passing component tests alone does not establish visual acceptance.

Buttons, fields, tabs, tables, badges, empty states, skeletons, alerts, and
feedback use shared components and semantic tokens. Layout presets may adjust
composition, but they must not replace component color, typography,
focus, or elevation with hard-coded values.

### Shell anatomy

These are the published shells. Compose them. Do not redraw them as generic cards.

| Shell | Contract | Chrome |
| --- | --- | --- |
| `Layout` | `data-svadmin-layout`, `data-svadmin-main`, `data-svadmin-sidebar`, `data-svadmin-topbar` | Sidebar and topbar are flat hairline regions. The default canvas removes their shadows. Active sidebar items use a 9% primary wash and a 4px bar. |
| `Sidebar` | `data-svadmin-sidebar`, `.sidebar-menu-item` | System sans at 13px / 500. Section labels are not uppercase. |
| `AutoTable` | `data-svadmin-table-head`, `data-svadmin-table-row`, `data-svadmin-datatable` | The table is not wrapped in a card. Header labels are 12px / 600, sentence case, `letter-spacing: 0`. Numbers use `tabular-nums`. |
| `PageToolbar` | `data-svadmin-table-toolbar` | A hairline row (`border-bottom`), transparent, no radius and no surface shadow. |
| `AutoForm` | `data-svadmin-form-row`, `data-svadmin-form-actions`, `data-svadmin-field-label` | Rows are separated by a hairline. Under the default preset, save actions are a footer rule, not a floating card. |
| `ConfigurationPage`, `SettingsGroup`, `SettingsFieldRow` | `data-svadmin-settings-group` | Unframed. The group header is a bottom border, title at 16px / 600, description in muted text. One page `h1`; nested groups use `h3`. |
| `MetricBlock` | `data-svadmin-metric-card` | This is the bounded card: 8px radius, hairline border, surface shadow. Do not put it inside another card. |
| `ApprovalCenter`, `ApprovalActionCard` | `data-svadmin-approval-center`, `.svadmin-approval-card` | Flat 4px surface, no shadow. The selected row uses an 8% primary wash. Approve uses the primary action color; reject stays danger. |
| `KanbanBoard`, `GanttChart` | `.svadmin-kanban`, `.svadmin-gantt` | The same 4px bordered surface. Columns use the muted fill; cards and bars have no shadow. Status text is 12px and sentence case. |
| `WorkspaceLayout` | `data-svadmin-workspace-layout` | 16px rhythm between the primary work and the secondary rail. It does not introduce another palette. |
| `ResourceOperationsPage`, `ResourceOverviewCard` | `data-svadmin-resource-operations`, `.svadmin-resource-overview-card` | The page title is 20px. The hero is an unframed hairline, and nested cards stay flat 4px surfaces. |
| `AuthPageShell`, `LoginPage` | `data-svadmin-auth-page`, `data-svadmin-demo-credentials` | One auth surface. The title stays at 20px / 600. Demo credentials are a divided note inside that surface, not nested tiles. |

`FilterToolbar` (`data-svadmin-filter-toolbar`) owns search and advanced filters.
Its advanced panel may use a muted fill. That panel is not a second page card.


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

- **svadmin is the primary reference:** palette, type, radius, component
  behavior, and page anatomy for list, form, detail, and result.
- **svadmin owns implementation:** semantic token names, component API, state
  ownership, accessibility, and responsive contracts.
- **shadcn/ui is the composition layer:** accessible primitives, source-owned
  components, semantic variants, and AI-readable assembly. It does not supply
  a second palette.
- **Refine is an application-model reference:** resource routing, CRUD flows,
  provider state, access control, and mutation ownership.
- **Stripe is an optional accent preset:** not the default canvas or primary.
- **Metronic is a coverage reference:** page families and missing scenarios only.

Never copy a reference library's runtime, marketing layout, or component chrome.
The published ramp is the explicit palette decision.

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

## Responsive behavior

Breakpoints already in the shell, not a new layout system:

- Sidebar content offset switches at `768px`. Below that, the sidebar does not
  reserve the 252px or 70px desktop margin.
- Filter toolbars become a horizontal row at `640px`.
- Content padding tightens at `48rem`.
- Auth credential columns stack at `40rem`.
- Coarse-pointer targets stay at least 44px. Fine-pointer tables may be denser.

## Do's and Don'ts

- Do keep hierarchy quiet, dense, aligned, and easy to scan repeatedly.
- Do show loading, empty, error, permission, progress, and mutation feedback.
- Do preserve visible keyboard focus and at least 44px coarse-pointer targets.
- Do remove, downgrade, or relocate feedback as soon as its state is resolved.
- Do use the system stack already set on the default layout:
  `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif`.
- Don't copy Metronic colors, decorative treatment, or template branding.
- Don't repeat a success fact across Toast, title, description, banner, badge,
  and table data.
- Don't use persistent success banners for routine mutations.
- Don't set `font-family` to Inter, or to any single downloaded face, as the
  product font. A system stack is the contract.
- Don't paint marketing gradients, mesh backgrounds, glass, a technical grid, or a purple hero.
  The canvas is flat.
- Don't put muted gray type on a saturated fill. Solid status fills use their
  foreground token. The tinted `.svadmin-product-status` badge mixes the status
  color into `--foreground` and keeps a neutral card base.
- Don't use cards inside cards, uppercase tracked labels, bounce easing, or
  make every section a floating card.
- Don't use decorative gradients, glow, glassmorphism, negative letter spacing,
  or blanket `!important` overrides as the default product language.

## Agent prompt guide

Read `PRODUCT.md` for who this product is, then follow this file for pixels.
`DESIGN.md` wins visual conflicts. `PRODUCT.md` wins product boundaries.

When generating a page, start from the shell table above and the page-family
matrix. Use semantic tokens (`--background`, `--foreground`, `--card`,
`--primary`, `--border`, `--muted-foreground`, `--success`, `--warning`,
`--destructive`). Do not introduce a parallel palette.

Quick light reference for the default clean-flat preset:

- Canvas `#F7F8FA`, ink `#1D2129`, surface `#FFFFFF`, hairline `#E5E6EB`.
- Action `#165DFF` on `#FFFFFF`. Dark action `#3C7EFF`.
- Body 14px / 400 / 1.4. Page title 20px / 600 / 1.3. Labels 13px / 500.
- Radius 2px on small controls and 4px on fields and surfaces. Spacing 4 / 8 / 16 / 24 / 32.
- Focus: 2px solid `--ring`, offset `--svadmin-focus-offset` (2px).

Reject the result when the first viewport has nested cards, a gradient hero,
Inter as the only font, gray text on a colored button, or the same fact repeated
in a banner and the data below it.

Do not add `npx impeccable detect` to CI. The UI workflow already builds
packages and checks browser contracts. A default detector run flags intentional
admin choices (the optional Stripe accent and compact tables) and would
need a large ignore list. Use that detector locally only as a hint, and keep
this file as the authority when a finding conflicts with the tokens above.
The default visual system remains the primary reference; do not treat a mismatch with page patterns
shell, illustrations, or card wall as a defect.
