# Audit content exact-optional evidence

Captured in real Chromium desktop viewports on 2026-09-26 with the modified
source audit components and the repository-generated UI styles in a controlled
component specimen (the repository's audit content test host), not a live
business deployment.

## Why this is non-visual

The change is type-only. It stops forwarding `undefined` to optional props under
`exactOptionalPropertyTypes`:

- `AuditContent` passes `title`/`retry` to `DataState` through `definedOptions`.
- `AuditContent` accepts an optional `children` snippet.
- `AuditSection` accepts optional `description`/`actions` explicitly typed with
  `| undefined`.

No markup, styling, or state behavior changes.

## State matrix

| State | Expected result | Evidence |
| --- | --- | --- |
| Ready, 1440x900 | Stock risk and Inventory chart sections render, no overflow | Screenshot + DOM read-back |
| Ready, 1920x1080 | Same sections render, no overflow | Screenshot + DOM read-back |
| Error, 1440x900 | `DataState` error passes through with title/retry forwarding | Screenshot + DOM read-back |
| Evidence card | Named article renders | DOM read-back `Source` |
| Runtime | No uncaught page errors | `pageerror` listener empty |

## Verification

- DOM regions at every capture: `Stock risk`, `Inventory chart`.
- Evidence article: `Source`.
- `document.documentElement.scrollWidth > clientWidth`: `false` at all captures.
- Page errors: none.
- `svelte-check` for `packages/ui/tsconfig.json` and root `tsconfig.browser.json`: 0 errors.
- `packages/ui` audit content tests: 13 passed.