# Surface business catalog: record detail and activity feed

Parent scope: the user-requested continuation of #441/#444. These workflows are
already on main; this increment adds two opt-in read-only business contracts and
keeps the default/styled catalog versions and all action approval boundaries.
No arbitrary OpenUI expressions, production data, model sampling, package release
or deployment is part of this increment.

## Shared contracts

`createBusinessSurfaceDefinitions(base?)` from `@svadmin/surface/business-contracts` is DOM-free.
`createBusinessSurfaceCatalog(base?)` from `@svadmin/surface/business` attaches the
real Svelte implementations to those exact definitions. The default base is the
styled catalog. The returned version appends `+business/v1`; old catalogs do not
silently accept the new widget types. Both definitions and renderers can be
passed as the base of the existing interactive catalog factory, before applying
`withSurfaceAppearance`. Prompts, response schemas and final runtime validation
use the same chosen catalog.

| Widget | Source/binding | Selected data |
| --- | --- | --- |
| `resource-detail` | `resource-one`, pointer `""`, `allowGetOne: true` | 1–16 distinct readable fields with label and finite format |
| `activity-feed` | `resource-list`, pointer `/items` | Explicit readable ID/action/time and optional actor/target/comment/status fields |

The additive `record` data kind permits the root of a **projected authorized
getOne record**, never the raw provider response. It requires a non-empty field
selector. Ordinary scalar widgets still cannot bind to a record root, and record
widgets cannot bind to list envelopes. Existing runtime projection strips
unreadable fields without invoking unreadable getters. Server record-level
authorization is still required; a browser resource policy is not backend auth.

```ts
import { createBusinessSurfaceCatalog } from '@svadmin/surface/business';
import { createInteractiveSurfaceCatalog } from '@svadmin/surface/interactive';

const readOnlyCatalog = createBusinessSurfaceCatalog();
const interactiveCatalog = createInteractiveSurfaceCatalog(actions, readOnlyCatalog);
// Use the identical action descriptors and DOM-free definitions on the server.
```

## Rendering and design

Detail uses existing Card primitives and the shared field formatter. False and
zero remain visible; HTML-like values are text, never executable HTML. The
activity wrapper uses the existing ActivityFeed with `allowComment=false`; no
comment handler, avatar URL or automatic write is supplied. It copies only the
mapped fields. Numeric and string IDs stay distinct; duplicate IDs, malformed
required/optional data and oversized collections fail visibly rather than crash
a keyed render or invent a successful event. Backend order and timestamp text
are preserved; the widget does not authenticate events or claim that an arbitrary
activity resource is a trusted audit log. Missing actor is explicitly unknown.

Both widgets select finite native tone/density props from the shared generated
design contract and existing precompiled Panda card/frame recipe. Internal
ActivityFeed slots do not acquire a new density recipe in this change. Existing
UI ActivityFeed defaults remain unchanged; optional header/count/empty text lets
the wrapper use Surface-local language. New Surface message keys are optional to
keep older host overrides source-compatible. Provider failures show a generic
localized message rather than raw backend diagnostics.

## Acceptance

Added tests cover schema/manifest/prompt consistency, all tone/density pairs,
forbidden fields across every activity mapping, root-pointer restrictions,
mandatory detail selectors, unreadable getters, false/zero, duplicate identity,
escaped HTML-like text, missing actor and localized loading/empty/error states.
Real Svelte regressions retain DOM and request counts on presentation-only edits
and remove private contents when permissions change.

The existing OpenUI conformance runner keeps its earlier cases and adds every
two-chunk split of a detail/timeline program through the **real pinned parser**.
Existing browser workflow tests remain. Additional Chromium cases stream the new
widgets next to the existing form, assert no writes, preserve the form draft and
request counts during appearance changes, reject a forbidden generated field,
and capture light/dark at 1440x900, 1920x1080 and 390x844. The packed-consumer gate
now exercises the actual business entry and DOM-free definitions together with
interactive and server entrypoints. Only current-run reports prove passage.

The generation evaluator adds two task assertions (record c1 detail and events
timeline), bringing the task set to five. These tests are not model calls or a
measured generation success rate. Real provider outputs, latency, token cost and
repair rate remain unmeasured; no synthetic response is reported as model evidence.

`./business` remains experimental with `minimumPublishedUi: null`, like the new
interactive entry. Same-checkout tarballs are not proof of older published UI
compatibility. Full reactive OpenUI, arbitrary nested UI trees, more business
widgets and native slot recipes remain outside this increment. No test, permission,
stylesheet baseline or release/evidence gate is relaxed.
