# SSR Dashboard-Class Boundaries (PivotTable / KanbanBoard / TreeTable)

Status: accepted (2026-10-30)
Scope: `@svadmin/lite` dashboard-class widgets and their `@svadmin/ui` counterparts
Decision owner: product review, recorded here so engineering does not drift

## Decision

Dashboard-class widgets stay `fallback` in the Lite parity matrix. Lite ships a
bounded, server-sorted read model plus native POST actions; client-side
interaction models are explicitly out of scope for SSR and stay with the SPA.

This is a deliberate boundary, not an unfinished implementation. Do not raise the
1:1 (exact) rate by relabelling these entries or by adding partial client state to
Lite.

## Why this needs a product decision

The parity table tracks capability parity. For these widgets the reference
capability is not "show data", it is "let a user reshape data without leaving the
screen":

| Widget | Reference capability | What the capability actually requires |
| --- | --- | --- |
| PivotTable | Drag fields between row/column/measure, recompute aggregates locally | Client-side aggregation engine, dimension state, local cache, optimistic re-render |
| KanbanBoard | Drag cards across columns, optimistic move, rollback on failure | Pointer drag model, per-card mutation queue, conflict handling, undo |
| TreeTable | Expand/collapse, indeterminate selection, keyboard tree navigation, client paging | Tree state and selection model in the client, focus management |
| SpreadsheetView | Formula recalculation, sheet switching, local undo | Formula engine, cell dependency graph, local edits |
| GanttChart | Dependency editing, drag-to-reschedule, working-calendar math | Timeline model plus scheduling rules in the client |

None of these can be reproduced with server HTML and native form semantics. Any
attempt would be a half-implemented interaction model that behaves differently
from the SPA — worse for users than a clearly bounded read model.

## Options considered

1. **Raise SSR parity by adding client state to Lite.** Rejected: Lite is the
   `csr = false`, no-JavaScript baseline. Adding client state breaks the IE11 and
   no-hydration contract documented in the Lite guide, and duplicates the SPA.
2. **Mark these as `exact` because they render the same underlying data.**
   Rejected: the matrix measures capability, not data shape. This would inflate
   the metric and hide the real product gap.
3. **Keep `fallback`, define the server-owned boundary per widget, and route the
   interactive job to the SPA.** Accepted.

## Accepted boundary per widget

Every Lite widget in this class must state, in its parity strategy text and its
component docs, three things: what the server renders, what the host owns, and
what the SPA owns.

| Widget | Lite renders | Host owns | SPA owns |
| --- | --- | --- | --- |
| PivotTable | Bounded aggregate table, typed dimensions, retry/export/drill links | Aggregation query, authorization, export job | Local pivot editing, local recompute, callback drill-down |
| KanbanBoard | Column groups, card list, native "add card" POST form | Ordering rules, permission checks, transition validation | Drag move, optimistic preview, rollback |
| TreeTable | Full nested table with expand links and server-provided depth | Tree pruning, page size, validation | Indeterminate selection, keyboard navigation, client paging |
| SpreadsheetView | Single bounded sheet POST with raw formulas | Formula evaluation, sheet catalog, export | Cell editing model, sheet switching, local undo |
| GanttChart | Bounded timeline table with dependency columns and links | Schedule validation, calendar rules, cascade writes | Bar drag, dependency editing, auto-scheduling |

## Non-goals

- No client-side pivot/filter/tree/schedule engines inside `@svadmin/lite`.
- No hydration in Lite routes; `ssr = true` and `csr = false` stay unchanged.
- No new Lite-only APIs to "paper over" the gap; the boundary is the API.
- No metric-driven relabelling of these entries.

## Acceptance evidence for this decision

- `packages/lite/PARITY.md` lists these entries as `语义降级` with a strategy that
  names the server-owned boundary.
- `docs/components/parity.md` and `docs/src/content/docs/guides/lite.md` link this
  decision, so readers see the boundary before the number.
- Behavior tests cover the read model that Lite does promise: grouping, ordering,
  empty state, and the native POST action.

## Revisit triggers

Reopen this decision only if one of these becomes true:

1. The product ships a server-side aggregation or scheduling API that makes local
   recompute unnecessary, so a static SSR view is genuinely equivalent.
2. Lite drops the `csr = false` baseline and accepts a hydration budget.
3. User research shows the bounded read model fails the primary job (for example,
   users cannot complete reconciliation without in-place pivot edits).

Any revisit must produce a new decision record and re-run the parity contract
tests; it must not silently change `status` values.