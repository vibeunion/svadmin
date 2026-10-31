# Review: `<details name>` as a progressive enhancement for `LiteCollapse`

Status: evaluated, not adopted
Scope: `LiteCollapse` in `@svadmin/lite`
Related: [parity criteria](../lite-field-parity-criteria.md)

## Question

Could `<details name>` give Lite a native exclusive accordion, and is that enough to
upgrade `Collapse` from `fallback` to `exact`?

## What the native feature actually provides

Where the `name` attribute is supported, `<details name="faq" open>` groups its
siblings so opening one closes the others — no JavaScript, works from server HTML.
Browsers without support ignore `name` and behave like independent `<details>`.

## Why it is not enough for `exact`

The reference component's contract is wider than "open one at a time":

- controlled `openIds` plus `multiple`/`accordion` modes,
- `disabled` sections that cannot be toggled,
- `destroyOnHide`/`lazyload`, i.e. content mounting policy,
- an `onchange` callback that reports the new open set.

`<details name>` covers the exclusive case only. The rest are client-state
capabilities, so `Collapse` stays `fallback` — the audit outcome is pinned in
`scripts/parity-contract.test.ts` (`keeps the fallback decisions for
NotificationCenter, Tree and Collapse`).

## Why LiteCollapse is not `<details>` today

`LiteCollapse` renders an anchor per section that targets `#id`; the CSS reveals the
body with `:target` and `data-open`. Switching to `<details name>` would:

- change the URL contract (no more `#id` navigation, so deep links to an open
  section would stop working),
- change the markup every host styles today,
- still not reach `exact`, because the client-state contract above stays unmet.

## Decision

Keep the anchor model, keep `fallback`, and document `<details name>` as a future
option **only** if the URL contract is renegotiated. This is recorded so a later
review does not re-litigate the same question from scratch.
