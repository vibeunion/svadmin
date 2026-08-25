# svadmin UI Generation Rules

Read `DESIGN.md` before creating, revising, or reviewing any UI. It is the
authority for visual language, page hierarchy, feedback ownership, and
acceptance checks in this project.

## Required workflow

1. Name the page's single primary workflow and dominant next action.
2. Inventory every heading, description, notice, metric, badge, and data view.
3. Assign each fact and event to one primary UI surface.
4. Reuse `@svadmin/ui` components and semantic Tailwind tokens before writing
   custom markup or raw colors.
5. Verify loading, empty, partial, error, permission, success, and mobile states.

## Feedback invariant

`one event -> one primary feedback surface`

- Field errors are inline.
- Routine success is a 3-second Toast.
- If success changes the page into a completed state, render that state and set
  `successNotification: false` on the hook or form.
- Persistent notices are only for unresolved context, required action, blocking
  failures, or risk. Use `FeedbackNotice`; it has no success variant.
- The first viewport may contain at most one full-width high-emphasis notice.
- A count or status already shown in a badge, table, progress state, or filename
  must not be repeated in a banner or explanatory paragraph.
- Toasts are keyed by event identity when duplicate delivery is possible. Do not
  deduplicate globally by message text.

## Reject generated UI when

- success appears simultaneously in a Toast, heading, description, Alert, badge,
  or result summary;
- the page contains decorative explanation panels or nested cards;
- copy only describes the controls or data immediately below it;
- a resolved success banner remains in the normal reading flow;
- desktop or mobile output overlaps, clips, scrolls horizontally, or pushes the
  primary action out of view.
