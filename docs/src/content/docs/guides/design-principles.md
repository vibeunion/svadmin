---
title: Design Principles
description: Seven Stripe-first principles for trustworthy admin products
---

svadmin uses Stripe as a visual authority, not as a brand template. Neutral
surfaces, precise hierarchy, restrained depth, and compact controls support
repeated operational work. These seven principles turn that direction into
reviewable product decisions.

## 1. Clear by default

Every page has one primary job, one dominant next action, and one owner for each
visible fact.

- Put the page title, scope, current state, and primary action in a predictable order.
- Add supporting copy only for a constraint, consequence, scope, or recovery path.
- Do not repeat a count in a heading, notice, badge, metric, and table.
- Keep at most one high-emphasis persistent notice above the main work area.

Use `ContentPageShell`, `ContentPageHeader`, `SectionHeader`, and
`FeedbackNotice` to make ownership explicit.

## 2. Efficient in the loop

Repeated admin work should preserve context and reduce navigation cost.

- Keep filters, selection, sort order, and pagination stable after local actions.
- Prefer keyboard-reachable commands and compact, stable controls.
- Fill loading content in place; do not move the primary action while data changes.
- Use `PageToolbar` and `FilterToolbar` for dense, predictable work controls.

## 3. Consistent by contract

Semantic tokens, variants, state names, page skeletons, and feedback lifecycles
must mean the same thing everywhere.

- Use shared components before adding page-local variants.
- A layout preset may change density and composition, not color meaning, focus,
  elevation, or feedback behavior.
- External design systems provide behavioral or coverage references only.

## 4. Trustworthy in every state

Loading, empty, partial, error, forbidden, destructive, reversible, and completed
states must communicate scope and the next step.

| Situation | Primary surface | Removal condition |
| --- | --- | --- |
| Loading | Skeleton or `DataState state="loading"` | Data settles |
| No matching data | `DataState state="empty"` | Filter or data changes |
| Recoverable failure | `DataState state="error"` with retry | Retry succeeds |
| Permission boundary | `DataState state="forbidden"` or blocking notice | Permission or route changes |
| Routine success | Toast | 3 seconds |
| Completed workflow | New local/page state | Navigation or restart |

The invariant is **one event -> one primary feedback surface**.

## 5. Restrained like Stripe

Content and hierarchy carry the interface.

- Use neutral canvases and one controlled interaction accent.
- Use hairline borders, subtle shadows, 6px controls, and 8px bounded surfaces.
- Cards represent objects or bounded tools; page sections are not decorative cards.
- Do not use gradients, glow, glassmorphism, negative tracking, or card-in-card decoration.

## 6. Accessible by construction

Accessibility is a component default, not a cleanup pass.

- Keep keyboard access and visible focus for every action.
- Use semantic headings, landmarks, labels, status roles, and live regions.
- Never communicate state by color alone.
- Preserve readable contrast, stable dimensions, and at least 44px coarse-pointer targets.
- Verify no clipping, overlap, or horizontal scroll on desktop and mobile.

## 7. AI-ready and auditable

Generated UI must declare its primary workflow, information owners, state owners,
and feedback removal conditions before visual polish is accepted.

Reject generated output when it duplicates facts, nests decorative cards, invents
a second palette, leaves feedback without a lifecycle, or lacks desktop/mobile
evidence. Use the trusted component catalog and the full [Interface Generation
Standard](/guides/interface-generation/) as the acceptance gate.

## Review order

Review pages in this order: clarity, efficiency, consistency, trust, restraint,
accessibility, and generation evidence. A polished page still fails when action
or state ownership is ambiguous.

The runnable example is available from **Dashboard -> Design Principles** in the
example application.
