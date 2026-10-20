---
title: Reference Targets
description: The unified reference targets, ownership boundaries, and acceptance entry points for svadmin enterprise admin UI
---

svadmin has a defined reference target, but it is not a third-party template and it
is not a new skin assembled from several component libraries. The target has five
layers, and each layer solves one problem.

## Five reference layers

| Layer | Single entry point | Owns | Does not own |
| --- | --- | --- | --- |
| Visual language | Root `DESIGN.md`, `packages/ui/src/app.css`, `packages/ui/src/recipes.ts` | Semantic colors, hierarchy, spacing, radius, elevation, focus, and motion limits | Business permissions, queries, or writes |
| Product workflow | `docs/ENTERPRISE_PRODUCT_SYSTEM.md` | Primary jobs, page families, field choices, action ownership, and feedback lifecycle | New tokens or component CSS |
| Executable target kit | `design/reference-kit/` | Three page patterns, 18 states, eight content components, and existing token mappings | Proof that production pages or Figma are accepted |
| Runtime composition | `PagePattern`, resource CRUD pages, `component-registry`, `surfaceDesignContract` | Page patterns, component states, and authoring API contracts | Queries, authorization, or business writes |
| Acceptance evidence | `docs/ui-state-matrix.md`, browser tests, and `docs/evidence/` | States, viewports, screenshots, and recovery paths | Reusing historical screenshots as current acceptance |

When rules conflict, use this order: permission and data truth, accessibility and
state contracts, the visual rules in `DESIGN.md`, the product workflow standard,
then structural observations from external references.

## Page targets

Choose a page family from the job:

| Job | First choice | States to verify |
| --- | --- | --- |
| Find and process a set of records | `ListPage` or `PagePattern list` | loading, empty, filtered-empty, error, forbidden, ready |
| Inspect one object and take the next action | `ShowPage` or `PagePattern detail` | loading, ready, partial, error, forbidden |
| Edit and submit configuration | `ConfigurationPage` or `PagePattern form` | pristine, dirty, invalid, saving, success, error, readonly |
| Process one object through multiple stages | `WorkspaceLayout` or `PagePattern workspace` | selection, primary/secondary regions, recovery, narrow-screen order |
| Observe metrics and drill into work | `DashboardPage` or `PagePattern dashboard` | metric loading, anomalies, empty, error, and drill-down entry |

`empty` means that the resource truly has no records. A query with active filters
and no matches must use `filtered-empty` and provide a clear or adjust recovery
path. A non-`ready` state must not keep showing stale business content as current.

## External reference boundaries

| Reference | Borrow only | Do not copy |
| --- | --- | --- |
| Refine | Resource CRUD, routing, data, and mutation ownership | Its page skin |
| Ant Design | Validation, feedback, empty/loading states, and dense-data behavior | Default blue, radius, or component chrome |
| shadcn/ui | Readable source, composition, and semantic variants | A second runtime or unconstrained page assembly |
| Carbon / PatternFly | Enterprise notifications, permissions, empty/error states, and operational layouts | Brand tokens |
| Fuse / Midone / Skote / Metronic | Navigation, page families, and scenario coverage | Template cards, gradients, fonts, logos, or CSS |

References answer what problems to cover. They do not override svadmin's own
colors, permissions, or accessibility decisions.

## Implementation order

For every new or changed page, leave evidence in this order:

1. State the primary role, job, decision basis, primary action, and recovery path.
2. Choose one page family and keep data, permissions, and writes in the host.
3. Reuse shared page shells, toolbars, state components, and semantic tokens.
4. Verify ready, loading, empty, filtered-empty, error, forbidden, and any
   page-specific partial or save states.
5. Capture the current version at `1440x900`, `1920x1080`, and when relevant
   `390x844`; then check focus, long text, overflow, and recovery.

## Completion boundary

Passing `python3 design/reference-kit/validate.py` proves only that the reference
metadata and current source mappings agree. It does not prove that real business
pages, the Figma file, production permissions, or deployment are accepted.
Browser tests, host integration, and production acceptance must be reported
separately; they must not collapse into a single claim that “the UI is complete.”
