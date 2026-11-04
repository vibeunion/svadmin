# Long-tail capability UI evidence

This evidence was generated from the current branch with
`scripts/fixtures/enterprise-ui/playwright.detail-drawer-status.spec.ts`.
The fixture mounts the real `DetailDrawer` component and checks the status,
extra content, and footer before capturing the two desktop viewports.
The capture is kept with this change so the PR links to evidence produced from
the submitted source tree rather than a historical baseline.

## State matrix

| State | Trigger | Expected result |
| --- | --- | --- |
| Ready | Drawer opens with a status and footer | Header, content, and footer remain visible and readable |
| Narrow touch | Viewport is at or below 420px | The drawer uses the full viewport and the content region keeps touch scrolling |
| Virtual scroll | A long table is focused and scrolled | Only the bounded row window renders; keyboard and touch scrolling remain available |
| Error/empty | Table loading, error, or no records | The existing loading, retry, and empty states remain the only content state |

## Viewports

- [1440x900](./long-tail-capabilities-1440x900.png)
- [1920x1080](./long-tail-capabilities-1920x1080.png)
