# Dashboard collapsible hook evidence

Captured in real Chromium desktop viewports on 2026-09-26 against the running
example application (dev server) with the modified `Dashboard.svelte`, in the
real `AdminApp` shell after demo login, not a component specimen.

## Change

`c0143b53` rewrote the dashboard `<details>` sections with only the
`.dashboard-secondary` class, dropping the `svadmin-collapsible` hook that the
UI repository audit (`scripts/ui-state-evidence-check.ts`) requires. This change
adds `svadmin-collapsible` alongside the existing class.

## State matrix

| State | Expected result | Evidence |
| --- | --- | --- |
| Dashboard at 1440x900 | Three `details.dashboard-secondary` carry `svadmin-collapsible` | Screenshot + computed style read-back |
| Dashboard at 1920x1080 | Same three sections, same hook | Screenshot + computed style read-back |
| Collapsed sections | Zeroed margin/padding/border and transparent background | Computed style read-back |
| Declarative Surface | Visible (moved outside the collapsed sections) | `getBoundingClientRect().height > 0` |
| Viewport overflow | None | `scrollWidth` check `false` |
| Runtime | No uncaught page errors | `pageerror` listener empty |

## Related E2E migration

`e2e/migration-layout.spec.ts` pinned the removed `[data-dashboard-panel]` Card
hook. The redesign replaced those Cards with `.dashboard-primary-grid` sections,
so the two assertions now target the host grid (`padding-top: 0px`, `row-gap:
16px`) instead of the obsolete attribute. `e2e/surface.spec.ts` requires the
Declarative Surface to be visible, which is why it is no longer nested inside a
collapsed `<details>`.

## Verification

- Read-back classes: `svadmin-collapsible dashboard-secondary` on all three sections.
- Collapsed computed style: `margin: 0px`, `padding: 0px`, `border-width: 0px`, `background: rgba(0, 0, 0, 0)`.
- `document.documentElement.scrollWidth > clientWidth`: `false` at both viewports.
- Declarative Surface visible at both viewports.
- `bun scripts/ui-state-evidence-check.ts`: PASS.
- `playwright test e2e/migration-layout.spec.ts e2e/surface.spec.ts`: 2 passed.