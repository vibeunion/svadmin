# Review: styling hooks for the structural layout components

Status: accepted (pending optional external review, see the note at the end)
Scope: `LiteLayout`, `LiteSidebar`, `LiteSplitPaneLayout`
Related: [parity criteria](../lite-field-parity-criteria.md),
`packages/lite/CLASS-HOOKS.md`

## Why these three needed a decision

Every other Lite component has one meaningful root, so a single `class` is a real
styling hook. The structural trio is different — the thing a host wants to restyle
(sidebar width, main padding, split ratio, divider handle) is *inside* the
component, not the outer box:

- `LiteLayout`: `div.lite-wrapper` contains `nav.lite-sidebar`,
  `nav.lite-mobile-nav` and `main.lite-main`.
- `LiteSidebar`: a single `nav.lite-sidebar`.
- `LiteSplitPaneLayout`: `div.lite-split-layout` contains
  `div.lite-split-pane-1`, `div.lite-split-divider`, `div.lite-split-pane-2`.

Putting a lone `class` on the wrapper would have been a **fake hook**: the
attribute would exist, `CLASS-HOOKS.md` would count it, and the host still could
not size the sidebar or the panes without reaching in with descendant selectors.

## Decision

| Component | Props | Lands on |
| --- | --- | --- |
| `LiteLayout` | `class` | `div.lite-wrapper` |
| | `classSidebar` | desktop `nav.lite-sidebar` |
| | `classMobileNav` | `nav.lite-mobile-nav` |
| | `classMain` | `main.lite-main` |
| `LiteSidebar` | `class` | the single `nav.lite-sidebar` |
| `LiteSplitPaneLayout` | `class` | `div.lite-split-layout` |
| | `classPane1` / `classDivider` / `classPane2` | the matching pane / divider |

Naming follows the existing `class*` prop convention already used by `@svadmin/ui`
(`class`, `className`), so hosts do not learn a second vocabulary.

## Backward compatibility

The class attributes are built with `` `lite-x ${hook}`.trim() ``, so omitting the
new props keeps the rendered HTML byte-identical (no trailing space, no empty
attribute) — a property the tests pin explicitly rather than trust:

- `merges the caller class and named hooks on LiteLayout`
- `keeps LiteLayout output unchanged without hooks`
- `merges the caller class on LiteSidebar`
- `merges class and pane hooks on LiteSplitPaneLayout`

## Coverage outcome

With these three, the styling hook audit reports **99/99 (100%)** of `exact`
entries that expose a hook in the reference. That number is reported separately
and still does not change any parity status — it exists so the debt cannot hide,
not so it can be traded for a better ratio.

## Note on the external review

The plan was to have Codex adjudicate this API (the same read-only review process
used for `TwoFactorStepper`). Two attempts were blocked by infrastructure, not by
the question: the CLI looped on `ERROR: Reconnecting... waiting for network` and a
failing MCP transport (`https://design.penpot.app/mcp/stream`), never returning a
verdict. This record therefore documents an in-repo review; if an external review
later disagrees with named hooks, the change is contained to the three components
and their four tests.