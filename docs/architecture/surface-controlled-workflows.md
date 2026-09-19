# Controlled Surface workflows and bounded OpenUI streaming

This is an opt-in extension, not a replacement for the read-only default catalog.
It preserves `surface/v1`, existing default/styled catalog versions, the owning
admin context, and the existing per-renderer data-source cache. It does not add
Tailwind, React, a second renderer, or a consumer-side Panda compiler.

## Public boundaries

| Entry | Responsibility |
| --- | --- |
| `@svadmin/surface/workflows` | DOM-free catalog definitions, action descriptor types and form lifecycle controller |
| `@svadmin/surface/interactive` | `createInteractiveSurfaceCatalog` and `SurfaceWorkflowProvider` |
| `@svadmin/surface/openui` | Real parser integration, static-language guard, normalization and generation messages |
| `@svadmin/surface/server` | Action registration, authorization/approval orchestration and revision/audit service |
| `@svadmin/surface/server/sqlite` | Node-only durable SQLite adapter |

The original root and Svelte entries remain usable without loading the server,
SQLite or the optional upstream OpenUI package. The new interactive entry is
initially tested with the matching workspace UI version. Its minimum published UI
version must be established before release: old peer-range compatibility evidence
for the original entries is not evidence for the new `JsonSchemaForm.idPrefix`
behavior. This change does not publish packages or migrate application databases.

## One component contract and a finite design vocabulary

`builtin-definitions.ts` is the DOM-free source of the original component
schemas, descriptions, examples and field selectors. Svelte attaches trusted
implementations to these same definitions. Server validation does not import a
browser component module.

`withSurfaceAppearance(catalog)` adds an optional `appearance` object to every
registered widget with a closed props schema (including unions of closed objects).
The vocabulary comes from the existing shared design contract: five semantic
tones and two densities. It selects the existing, precompiled Panda frame recipe.
No model-provided class, raw CSS, color or recipe is executed. Existing components
receive their original props, and field-policy selectors are preserved.

This is **frame-level** coverage, not a claim that every internal slot or business
component has acquired native `tone`/`density` variants. Existing native metric
and table props remain separate. Old catalogs do not silently accept new props.

The interactive catalog adds `resource-form` to the same registry. Its `actionId`
uses the registered action IDs, labels, versions and approval descriptions. The
model may select an action and title, but cannot invent field schemas, initial
values, handlers, endpoint URLs, approval rules, identities or write parameters.

## Real OpenUI parser, constrained language

The host explicitly injects `createStreamingParser` from the real
`@openuidev/lang-core`. The acceptance job installs **0.3.0** in an isolated
fixture prefix with lifecycle scripts disabled; no workspace dependency or lock
entry is added. There is no mock parser fallback.

```ts
import { createStreamingParser } from '@openuidev/lang-core';
import { createSurfaceOpenUIStream } from '@svadmin/surface/openui';

const stream = createSurfaceOpenUIStream({ catalog, policy, createStreamingParser });
const partial = stream.push(receivedTextChunk);
// `partial.preview` is validated structural output, not permission to write.
const final = stream.finish();
// Only a complete successful final result can be submitted for explicit acceptance.
```

Supported example, where `contacts.create` was registered by the application:

```text
root = Surface("contacts", "Contacts", [records], [count, form], "md")
records = Source({"id":"records","type":"resource-list","resource":"contacts","pageSize":10})
count = Metric("count", {"label":"Contacts","format":"number"}, {"sourceId":"records","pointer":"/total"}, 4)
form = ResourceForm("form", {"actionId":"contacts.create","appearance":{"tone":"info","density":"compact"}}, null, 8)
```

A bounded static-declaration guard rejects executable expressions, inline calls,
state, `Query`, `Mutation`, `Action`, unsafe or duplicate keys, cyclic/reused
references, and oversized input before the upstream parser receives them.
Complete declarations are released during `push()`, not only at `finish()`.
Forward references resolve progressively. Incomplete trailing syntax is never
auto-closed into an actionable form. Finalization rejects unresolved and orphaned
declarations. Every emitted Surface is revalidated against the same catalog and
resource policy. No data provider, model, tool or business handler is invoked by
this adapter.

This is **not full OpenUI language/runtime compatibility**: static named component
composition is the supported subset. General reactive expressions, arbitrary
nested Surface node trees, upstream query/mutation execution, and language-level
incremental edit merging are not included. Existing Surface edit APIs remain the
path for validated revisioned edits. Capability rejection can continue through
the existing `surface-agent/v2` adapter; unsupported OpenUI output fails closed.

Keep `SurfaceWorkflowProvider.enabled=false` for all streaming, failed and
unaccepted previews. Disable the provider and discard pending proposals before
switching authenticated account, tenant, permissions or accepted surface revision.
A host choosing live read-only previews must explicitly apply its read policy;
streaming does not grant access and partial results must not be auto-persisted.

## Nested forms and explicit business writes

`JsonSchemaForm` is reused, rather than introducing another form engine. The
registered input schema supports inline closed objects, homogeneous nested
arrays, strings, numbers, integers and booleans, up to 128 schema fields and eight
levels. Unsupported unions, references, transforms and `writeOnly` secret fields
are rejected. This first form renderer is not a credential or file-upload UI.
Advanced inputs must be implemented as reviewed custom widgets.

The UI follows separate user-driven operations:

1. Submit validated form input to create a pending proposal.
2. Confirm the exact proposal, or obtain an independently authorized approval.
3. Explicitly execute the approved proposal.

Submitting, approving, streaming, changing appearance, and mounting a component
never invoke the business handler automatically. A successful action invokes a
trusted completion callback once; the host may refresh only affected sources.
Presentation-only updates retain the same keyed component and user draft. Scope
changes discard stale proposals and late responses. Stable form ID prefixes and
state snapshots support multiple nested forms on one page.

## Server orchestration and persistence

Use `defineSurfaceAction` with a closed immutable input schema, an explicit
`confirm` or `four-eyes` approval rule, a mandatory authorization callback, and a
trusted executor. The service re-derives validation from the schema rather than
accepting a looser custom `validateInput` callback.

`createSurfaceWorkflowService` requires a store and `authorizeSurface`. All
identities must come from authenticated server middleware. HTTP authentication,
CSRF/origin protection, rate limits, backend record/field authorization and
application retention rules are still required; a browser `enabled` flag is not
a security boundary. The E2E fixture's synthetic identity headers are **not a
production authentication implementation**.

The service supplies:

- Versioned surface save/read with atomic expected-revision checks and validation.
- Pending proposals bound to tenant, requester, accepted surface revision, action
  version, approval policy and a canonical argument digest.
- Idempotent proposal creation per tenant/requester/request key; different input
  with the same key is a conflict.
- Explicit confirmation or separate-actor approval; authorization is rechecked at
  execution, including the approver's current approval permission.
- An atomic execution claim, recorded completion, cancellation and status lookup.
- Atomic lifecycle audit records, with cursor pagination and authorization.

The SQLite adapter uses parameterized statements, a local persistent database,
WAL, and atomic transactions. Revisions and corresponding audit records commit or
roll back together. Two connections cannot successfully claim the same approved
proposal twice. Restarting a service preserves revisions, proposals and audit.
Audit metadata excludes submitted arguments and results; proposal storage still
contains them and needs appropriate access controls, encryption/retention policy
and backups. Append-only through the adapter does not mean cryptographically
tamper-proof against a database administrator.

A thrown executor or uncertain response is **indeterminate**, not safe to retry.
If the business effect succeeds but recording fails, the durable `executing`
claim blocks a second execution. Forward the proposal ID as the business backend
idempotency key. This does **not** guarantee exactly-once effects across external
services or databases. Recovery after a process crash, reconciliation tooling,
distributed stores and application-specific compensation remain follow-ups.
Do not use this SQLite adapter on an ephemeral or shared network filesystem.

## Acceptance and generation evaluation

The new `Surface controlled workflows` CI job builds real workspace packages,
runs Surface tests, installs the real optional OpenUI parser, then runs Chromium.
The deterministic browser scenario covers streaming-disabled writes, nested
object/array inputs, multiple form IDs, draft preservation, unchanged-source
query counts, explicit proposal/approval/execution, audit and tenant denial.
It captures 1440x900, 1920x1080 and narrow-screen evidence for that run. Four-eyes,
revocation, duplicate claims, conflicts, expiry, rollback and restart are covered
by Node service tests using actual SQLite.

```bash
bun install
bun run build:packages
bun run --cwd packages/surface test
npm install --prefix /tmp/surface-openui --ignore-scripts --save-exact @openuidev/lang-core@0.3.0
export SVADMIN_OPENUI_ENTRY=/tmp/surface-openui/node_modules/@openuidev/lang-core/dist/index.mjs
node scripts/surface-workflows/openui-conformance.mjs
bun run playwright test --config scripts/surface-workflows/playwright.config.ts
```

These are deterministic protocol/interaction tests with synthetic data, **not a
measured real-model generation success rate**. Model/provider sampling, intent
correctness, repair rate, latency and token budgets must be measured separately.
The companion evaluator accepts actual saved model outputs and scores them
against checked-in task assertions; it does not call a provider or fabricate
samples. A green fixture cannot substitute for that benchmark or full repository
CI, package consumers, design-system checks and current-commit browser evidence.
