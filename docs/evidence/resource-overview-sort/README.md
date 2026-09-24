# ResourceOverview sort evidence

Captured in real Chromium desktop viewports on 2026-09-24 with the modified
source `ResourceOverview.svelte` and the repository-generated UI styles in a
controlled component specimen, not a live business deployment.

## State matrix

| State | Expected result | Evidence |
| --- | --- | --- |
| Resources with `menuOrder` 30/10/20 | Rendered ascending (Alpha, Beta, Gamma) | DOM read-back at both viewports |
| `showInMenu: false` | Hidden from the overview | DOM read-back (not listed) |
| Nested resource (`parentName`) | Hidden from the top-level overview | DOM read-back (not listed) |
| Viewport 1440x900 | No horizontal overflow | Screenshot + `scrollWidth` check `false` |
| Viewport 1920x1080 | No horizontal overflow | Screenshot + `scrollWidth` check `false` |
| Runtime | No uncaught page errors | `pageerror` listener empty |

## Why this is non-visual

The only implementation change replaces `Array.prototype.toSorted` with
`Array.prototype.sort` on the freshly filtered array. Both return the same
ascending `menuOrder` order; the filter already produces a new array, so the
in-place sort does not mutate the captured admin context. The change removes the
ES2023 runtime requirement while keeping the ES2022 workspace target.

## Verification

- DOM order at both viewports: `Alpha, Beta, Gamma`.
- `document.documentElement.scrollWidth > clientWidth`: `false` at both viewports.
- Page errors: none.
- Screenshots were produced from the built specimen; the DOM read-back above is
  the machine-verifiable acceptance and the PNGs are attached for human review.