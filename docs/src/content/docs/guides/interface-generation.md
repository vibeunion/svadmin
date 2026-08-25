---
title: Interface Generation Standard
description: Information budgets, feedback ownership, page states, and AI acceptance rules
---

svadmin uses a **Stripe-first visual language**. External systems fill specific
behavior and coverage gaps; they are not mixed into a new visual theme.

## Reference stack

| Reference | Use it for | Do not copy |
| --- | --- | --- |
| Stripe | Hierarchy, restraint, neutral surfaces, precise product tone | Product-specific branding |
| [Refine](https://refine.dev/docs/) | Resources, CRUD flows, provider state, mutation ownership | React implementation or UI theme |
| [Ant Design](https://ant.design/components/overview/) | Feedback selection, forms, results, empty/loading states, data density | Blue palette, radius, shadow, component chrome |
| [shadcn/ui](https://ui.shadcn.com/docs) | Accessible composition, semantic variants, source-owned components | React-only APIs or default styling |
| [Carbon](https://carbondesignsystem.com/) / [PatternFly](https://www.patternfly.org/components/) | Enterprise notification lifecycle, error/empty states, operational layouts | Brand tokens and visual identity |
| [Metronic](https://keenthemes.com/metronic/tailwind/demo1/) | Page-family coverage and missing scenarios | Visual style, decoration, typography |

Refine plus Ant Design is useful as a **behavioral reference implementation**:
Refine owns resource/mutation state and Ant Design renders mature feedback and
data patterns. svadmin should reproduce the contract in Svelte, not clone the UI.

## Page information budget

Every generated page starts with four decisions:

1. What is the single primary workflow?
2. What unresolved state blocks or changes that workflow?
3. Which surface owns each fact, count, and status?
4. What should disappear after the user resolves it?

From the page header through the main work area, use at most one full-width,
high-emphasis persistent notice. A description is justified only when it adds a
constraint, consequence, scope, or recovery path. Do not restate headings,
labels, buttons, filenames, badges, progress values, or table totals.

## Feedback decision table

The invariant is **one event -> one primary feedback surface**.

| Situation | Surface | Duration |
| --- | --- | --- |
| Field validation | Inline field message | Until corrected |
| Successful mutation with no next action | Toast | 3 seconds |
| Success changes the page into a completed state | New page/local state, with automatic Toast disabled | Until navigation or restart |
| Partial result requiring action | `FeedbackNotice tone="warning"` | Until resolved |
| Blocking failure or permission boundary | `FeedbackNotice tone="danger" priority="blocking"` | Until resolved or dismissed |
| Relevant non-blocking context | `FeedbackNotice tone="info"` | While relevant |
| Reversible mutation | Undoable Toast | Undo window |

`FeedbackNotice` intentionally has no success tone. Low-level `Alert` retains a
success variant for compatibility, but it is not the default for page-level
mutation success.

When a component renders the completed state itself, disable the hook notification:

```ts
const forgot = useForgotPassword({ successNotification: false });

const form = useForm({
  resource: 'orders',
  action: 'create',
  successNotification: false,
});
```

Use event keys only when duplicate delivery is possible:

```ts
notification.success('Order saved', 3000, {
  key: `order:${orderId}:save:${revision}`,
});
```

Keys identify an event, not a translated message.

## OCR example

After OCR, the filename, recognized-field count, confirmed count, and table
already prove that recognition succeeded. Do not add a full-width persistent
success banner repeating those facts.

The correct hierarchy is:

- Show recognition success as a 3-second Toast or a compact status inside the
  upload control.
- Keep the unresolved “3 fields require input” warning as the one persistent,
  actionable notice.
- Put its single action next to the notice.
- Remove the notice when all missing fields are resolved.

## AI generation gate

Reject generated UI when any condition is true:

- the same success appears in a Toast, title, description, Alert, badge, and data;
- the first viewport contains more than one high-emphasis persistent notice;
- explanatory panels only describe controls or results already visible nearby;
- cards are nested or sections are framed only for decoration;
- feedback has no owner, no removal condition, or more than one primary action;
- desktop or mobile output overlaps, clips, scrolls horizontally, or displaces
  the primary action.

New `create-svadmin` projects receive `DESIGN.md` and `AGENTS.md` at the project
root so coding agents can apply these rules before generating UI.

Existing projects can add only the missing files without overwriting local work:

```bash
bunx @svadmin/create guidance .
bunx @svadmin/create guidance . --write
```
