---
title: Declarative Surface
description: Version, review, and render policy-constrained JSON dashboards
---

`@svadmin/surface` is an optional browser package for dashboards and operational views that are more flexible than generated CRUD pages. It accepts a versioned JSON spec, validates the complete document, performs read-only resource queries, and renders only components registered by the host.

The `surface/v1` wire contract stays deliberately small. Storage, revisions, bounded Patch, trusted actions, and live invalidation are separate host-controlled layers. Human-approved Agent proposals live in the optional `@svadmin/surface-agent` package.

```bash
bun add @svadmin/surface @svadmin/core @svadmin/ui @tanstack/svelte-query svelte zod
# Only when Agent proposals are needed:
bun add @svadmin/surface-agent
```

## Layered API

| Import | API | Responsibility |
| --- | --- | --- |
| `@svadmin/surface` | spec validation, documents, stores, Patch, actions | DOM-free contracts and controlled state changes |
| `@svadmin/surface/svelte` | `SurfaceRenderer`, catalog, live integration | trusted browser rendering |
| `@svadmin/surface-agent` | proposal validation and workflow | pending proposal, digest, approval/rejection |
| `@svadmin/surface-agent/svelte` | `SurfaceProposalReview` | visible before/after human-review UI |

The renderer still uses only `Pick<DataProvider, 'getList' | 'getOne'>`. A spec cannot choose a provider, execute a URL, or declare an action handler.

## Render a surface

```svelte
<script lang="ts">
  import type { SurfacePolicy, SurfaceSpec } from '@svadmin/surface';
  import {
    DEFAULT_SURFACE_CATALOG_VERSION,
    SurfaceRenderer,
    type SurfaceLiveProvider,
  } from '@svadmin/surface/svelte';

  const policy = {
    resources: {
      products: {
        readFields: ['id', 'name', 'stock'],
        filterFields: ['stock'],
        maxPageSize: 25,
      },
    },
  } satisfies SurfacePolicy;

  const spec = {
    schemaVersion: 'surface/v1',
    catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
    surfaceId: 'inventory',
    title: 'Inventory',
    layout: { type: 'grid', columns: 12, gap: 'md' },
    dataSources: [
      { id: 'products', type: 'resource-list', resource: 'products', pageSize: 10 },
    ],
    widgets: [{
      id: 'stock',
      type: 'bar-chart',
      props: { title: 'Stock', labelField: 'name', valueField: 'stock' },
      binding: { sourceId: 'products', pointer: '/items' },
      placement: { columnSpan: 12 },
    }],
  } satisfies SurfaceSpec;

  const liveProvider: SurfaceLiveProvider = appLiveProvider;
  let renderer = $state<{
    refresh(sourceId?: string): Promise<void>;
    executeAction(action: unknown): Promise<unknown>;
  }>();
</script>

<button type="button" onclick={() => renderer?.refresh()}>Refresh</button>
<SurfaceRenderer bind:this={renderer} {spec} {policy} {liveProvider} liveMode="auto" />
```

`liveMode` defaults to `off`. In `auto` mode, subscriptions start only for resources that pass the current read access check. An event is only an invalidation hint: its payload never reaches a widget. Bursts are coalesced, authorization is checked again before refresh, stale generations are discarded, and subscriptions are removed when the component or resource set changes.

`refresh(sourceId?)` and `executeAction(action)` are trusted host methods. Neither capability enters the wire contract, and refreshing does not recreate widget DOM.

## Documents, drafts, publication, and rollback

`SurfaceDocument` wraps a valid `SurfaceSpec` with `scopeId`, immutable `revision`, `draft` or `published` stage, timestamp, and provenance. `SurfaceStore` is application-supplied:

```ts
interface SurfaceStore {
  read(request: SurfaceStoreReadRequest): Promise<SurfaceDocument | null>;
  history(request: SurfaceStoreHistoryRequest): Promise<readonly SurfaceDocument[]>;
  append(request: SurfaceStoreAppendRequest): Promise<SurfaceStoreAppendResult>;
}
```

Production `append()` implementations must perform the `expectedRevision` comparison and append atomically. A suitable database model uses an immutable revision table, a unique `(scope_id, surface_id, revision)` constraint, and a transaction or conditional insert. The included `createMemorySurfaceStore()` is for examples and deterministic tests only.

```ts
const dependencies: SurfaceDocumentDependencies = {
  store,
  catalog,
  policy,
  authorize: async ({ scopeId, surfaceId, actorId, action }) =>
    permissions.canChangeSurface({ scopeId, surfaceId, actorId, action }),
};

const saved = await saveSurfaceDraft({
  dependencies,
  scopeId: 'tenant:acme',
  spec,
  expectedRevision: 4,
  actorId: currentUser.id,
  operationId: crypto.randomUUID(),
});
```

`saveSurfaceDraft`, `publishSurfaceDocument`, `rollbackSurfaceDocument`, `readSurfaceDocument`, and `listSurfaceDocumentHistory` return Result values. Publication and rollback append new immutable revisions. Rollback copies the selected historical spec into a new draft; it never rewrites or deletes history. A later draft does not replace the latest published selector.

## Bounded Patch

Surface Patch is intentionally smaller than general JSON Patch:

- accepted operations: `add`, `remove`, `replace`, and `test`;
- mutable roots: `/title`, `/layout`, `/dataSources`, and `/widgets`;
- forbidden roots: schema/catalog versions and `surfaceId`;
- no `move`, `copy`, `from`, prototype keys, non-canonical indexes, or array append outside a final `add` token;
- at most 64 operations and a 512-character pointer;
- full JSON-safety, policy, catalog, and `SurfaceSpec` validation after application.

`previewSurfacePatch()` returns `before`, `after`, and changed paths without writing. `commitSurfacePatch()` re-reads the base revision, performs write authorization, and appends with compare-and-swap. Validation, authorization, stale revision, or failed `test` produces zero writes.

## Trusted Action Registry

Actions are host runtime capabilities. They are never serialized into a `SurfaceSpec`. The default registry provides:

- `refreshSource` — refresh one or all sources;
- `setFilter` and `clearFilter` — manage policy-checked transient filters;
- `navigateResource` — send an allowed resource and optional record ID to a host callback.

Use `defineSurfaceActionRegistry()` with a strict Zod schema for custom actions. The handler is trusted executable code, so keep its authority narrow and apply backend authorization to any side effect. Do not accept raw URLs, JavaScript, provider selection, credentials, or arbitrary mutation parameters.

## Agent proposal and approval

`@svadmin/surface-agent` accepts exactly one `svadmin.surface.patch-proposal/v1` component from an `AgentProvider`. Tool calls, approval events, and tool results are rejected. The Agent supplies only the target surface, base revision, summary, and bounded operations; the host supplies scope, proposal ID, current user, authorizer, store, policy, and catalog.

```ts
const workflow = createSurfaceAgentWorkflow({
  dependencies,
  scopeId: 'tenant:acme',
  surfaceId: 'inventory',
});

const proposed = await workflow.request(agentOutput);
if (!proposed.ok) throw new Error(proposed.error.code);
// Render proposed.review.before and proposed.review.after.
const applied = await workflow.approve({
  proposalId: proposed.review.proposalId,
  actorId: currentUser.id,
  operationId: crypto.randomUUID(),
});
```

The workflow creates a host-generated proposal ID, binds scope/surface/base/catalog/summary/operations into a SHA-256 digest, computes a complete visible preview, and keeps the proposal pending. Approval is single-use: it rechecks proposal expiry and status, authorizes `approve`, re-reads and revalidates the document, authorizes the actual `write`, and commits with compare-and-swap. Rejection, expiry, replay, invalid output, or revision drift writes nothing.

Pending proposals are memory-backed in this first adapter. Production applications should persist proposal/audit state server-side if it must survive process restarts. Never give an Agent direct access to `SurfaceStore`, `DataProvider`, action handlers, actor/scope selection, or approval credentials.

## Policy and threat model

Treat specs, stored documents, Provider results, live events, actions, Patch documents, and Agent output as untrusted data. The implementation rejects inherited/accessor/symbol properties, cycles, sparse arrays, excessive depth/nodes, dangerous pointers, unknown widgets/resources/actions, duplicate IDs, forbidden fields, and non-JSON values. Invalid input produces serializable errors rather than ordinary exceptions.

Browser access checks and the write authorizer are presentation/workflow gates. The backend must independently authenticate and authorize resource reads and durable document writes; it must not trust browser-provided policy, scope, actor, revision, or approval state.

Aggregations such as revenue totals belong in a backend summary resource and bind through `resource-one`. Do not derive business totals from one paginated browser response.

## Compatibility and remaining boundaries

Both packages publish `compatibility.json`. Packed-consumer gates exercise Node ESM roots and Svelte/Vite subpaths, including the release-prepared `@svadmin/surface-agent` peer range.

Still out of scope: SSR/Lite rendering, Canvas, iframe, arbitrary HTML/CSS/code/URLs, actions declared by the spec, general CRUD mutations, polling, client-side aggregation, dataset snapshots, credentials, connector scheduling, and a production persistence adapter. These boundaries keep `surface/v1` deterministic and auditable.
