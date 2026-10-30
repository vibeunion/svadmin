# Widget Positioning Decision: Read-Only Dashboard Surfaces

Status: accepted (2026-10-30)
Scope: `@svadmin/lite` widget/chart catalog and its parity rows
Related: [SSR dashboard-class boundaries](./ssr-dashboard-boundaries.md)

## Question

`widgets` has 33/37 mappings covered by behavior assertions but only 40.5% 1:1
parity. Is that a delivery gap to close, or the intended positioning?

## Decision

Accept the positioning: **Lite widgets are read-only inspection surfaces.** They
render server-sorted data, inline SVG or tables, and native links/forms. Interactive
analysis stays in the SPA. We will not spend SSR capacity chasing widget parity.

Consequences, in order of importance:

1. **No more SSR interaction work for widgets.** No client-side chart
   interaction, pivoting, drag ordering, or carousel autoplay inside Lite.
2. **The 1:1 rate for widgets is expected to stay low.** It is not a KPI for this
   category; the KPI is "asserted coverage of the read model" (currently 33/37).
3. **Widget pages must offer an explicit path to the interactive view.** If a host
   route needs interactive analysis, it must link to the SPA route rather than
   imply Lite supports it.
4. **Chart visuals are a rendering improvement, not a parity claim.** Inline SVG
   charts shipped in `LiteChartSvg` keep the `fallback` status because tooltips,
   zoom and legend toggling are client capabilities.

## Why

- Lite's contract is `ssr = true`, `csr = false`, no hydration and an IE11 CSS
  baseline. Every interactive widget feature breaks at least one of those.
- The interactive job is already owned by the SPA; duplicating it in Lite creates
  two divergent interaction models with the same data.
- Users who need to inspect a metric on a constrained/no-JS client get the read
  model plus a link; users who need to explore it use the SPA. Both paths stay
  honest about what they do.

## Options considered

1. **Raise widget 1:1 parity by adding client state to Lite.** Rejected — violates
   the no-hydration contract and duplicates the SPA.
2. **Relabel widgets as `exact` because they render the same data.** Rejected —
   inflates the metric and hides the interaction gap.
3. **Accept read-only positioning and stop tracking widget 1:1 as a target.**
   Accepted.

## What we will measure instead

| Metric | Where | Target |
| --- | --- | --- |
| Asserted coverage of widget read models | `packages/lite/parity.json` → `categories.widgets.behaviorAsserted` | keep at 33/37, no regressions |
| Chart render contract (SVG + accessible table + empty state) | `LiteChartWidgets.test.svelte.ts` | every chart widget covered |
| Escape path to interactive SPA view | host route review | every interactive widget page links to the SPA route |

## Non-goals

- No new Lite chart interaction APIs (no `onZoom`, `onLegendToggle`, `onDrag`).
- No Lite pivot/kanban/timeline interaction state.
- No claiming 1:1 parity for chart widgets while they are static.

## Revisit triggers

1. Lite adopts a hydration budget for a subset of widgets (new architecture
   decision required first).
2. User research shows the read-only widget set fails the primary dashboard job.
3. A server-side aggregation API makes local interaction unnecessary.