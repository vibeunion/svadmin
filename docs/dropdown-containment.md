# Dropdown Containment

Row-action menus must remain usable inside clipped tables and scrollable drawers.
The dropdown content uses the existing Floating UI dependency for fixed placement,
viewport flipping, shifting, and available-space constraints. While open, it tracks
scroll, resize, and animated ancestors.

On browsers with the Popover API, content renders in the browser top layer using
a manual popover. Its DOM parent does not change: drawer focus containment,
RowActions keyboard navigation, outside-click detection, and focus restoration
continue to use the same ownership boundary. The controlled `open` state remains
the source of truth; native auto-dismiss is not enabled.

Browsers without Popover API retain fixed-position rendering but do not gain
top-layer protection from transformed ancestors. This change does not claim full
clipping protection for those browsers. No new dependency, navigation, or business
action is introduced.

## Acceptance

```gherkin
Scenario: A table clips its descendants near the viewport edge
  Given a row menu trigger is in an overflow-hidden table at the bottom right
  When the user opens its actions in a Popover-capable browser
  Then the menu flips into the viewport and every enabled action is clickable

Scenario: A menu belongs to a transformed scrollable drawer
  Given an open drawer contains the row menu
  When the user opens it with ArrowDown and presses Escape
  Then only the menu closes and focus returns to its trigger inside the drawer

Scenario: The anchor moves while the menu is open
  Given the menu is open
  When its scroll container or viewport changes
  Then placement is recalculated and content remains within available space
```

Rollback restores the previous dropdown content implementation. No data migration
or consumer API change is needed.

## Focused Verification

```sh
bun run --cwd packages/ui test src/components/row-actions-and-detail-drawer.test.svelte.ts
bun scripts/dropdown-containment-smoke.ts
git diff --check
```

The smoke script starts an isolated loopback Vite fixture on an available port,
runs Chromium and WebKit at 1440x900 and 1920x1080, then closes browsers and server.
It checks viewport flipping, real hit testing outside the clipped parent,
scroll tracking, drawer keyboard focus, action execution, and page errors.
Screenshots are saved under `output/playwright/dropdown-containment/`.
