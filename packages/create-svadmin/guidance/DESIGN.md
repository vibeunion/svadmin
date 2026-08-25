---
version: "alpha"
name: "svadmin Stripe-first"
description: "A restrained, precise product interface for repeated administrative work."
colors:
  background: "oklch(0.982 0.003 264)"
  foreground: "oklch(0.205 0.012 264)"
  surface: "oklch(1 0 0)"
  surface-subtle: "oklch(0.968 0.004 264)"
  muted-foreground: "oklch(0.493 0.018 264)"
  border: "oklch(0.914 0.006 264)"
  primary: "oklch(0.558 0.22 278)"
  on-primary: "oklch(0.99 0 0)"
  success: "oklch(0.51 0.16 151)"
  warning: "oklch(0.7 0.15 75)"
  danger: "oklch(0.58 0.22 27)"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0px"
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0px"
rounded:
  sm: "4px"
  md: "6px"
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

svadmin uses a Stripe-first product language: quiet neutral canvases, precise
type, hairline borders, restrained elevation, compact controls, and clear
feedback for repeated operational work. The interface should feel like a real
administrative product with trustworthy states, not a collection of dashboard
templates.

Metronic is a capability reference only. Its page families, information
architecture, and scenario coverage may expose missing components or examples,
but its palette, decoration, card treatment, typography, and branding are not
visual authority.

## Colors

Neutrals carry the interface. Primary is a single controlled interaction accent,
not a page background. Success, warning, and danger are reserved for semantic
status and feedback. Consumer themes may replace the primary hue while keeping
the neutral hierarchy and contrast relationships intact.

## Typography

Use Inter or the consumer's compatible system sans. Product pages use compact
headings and normal letter spacing. Uppercase table labels, negative tracking,
and oversized dashboard numerals are not defaults.

## Layout

Use an 8px spacing rhythm with 4px for tight internal alignment. Pages are
unframed layouts with a stable content width. Cards represent individual
objects or bounded tools; page sections are not decorative floating cards and
cards are not nested for visual effect.

## Elevation & Depth

Surfaces use a one-pixel border plus a subtle two-layer shadow. Hover elevation
may increase slightly for genuinely clickable items, without translation or
glow. Dialogs and menus receive stronger depth because they are floating
layers. Dark mode keeps the same hierarchy with low-chroma surfaces.

## Shapes

Controls use 6px radii and bounded surfaces use 8px radii. Pills are limited to
status badges, avatar groups, and controls whose geometry carries meaning.

## Components

Buttons, fields, tabs, tables, badges, empty states, skeletons, alerts, and
feedback use shared components and semantic tokens. Layout presets may adjust
density and composition, but they must not replace component color, typography,
focus, or elevation with hard-coded values.

### Reference responsibilities

The reference stack is layered. It is not a visual mixture:

- **Stripe is the visual authority:** hierarchy, restraint, neutral surfaces,
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
- Don't use gradients, glow, glassmorphism, negative letter spacing, or blanket
  `!important` overrides as the default product language.
- Don't use cards inside cards or make every section a floating card.
