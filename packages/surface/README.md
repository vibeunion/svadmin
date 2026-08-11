# @svadmin/surface

`@svadmin/surface` renders a small, versioned JSON contract as a trusted Svelte dashboard. It is an optional browser package and does not change the public contract of `@svadmin/core`.

The package supports Svelte 5 + Vite, a fixed 12-column grid, four built-in widgets, read-only `DataProvider` queries, immutable document revisions, bounded JSON Patch, trusted runtime actions, and opt-in `LiveProvider` invalidation. Agent proposal and approval UI lives in the separate `@svadmin/surface-agent` package.

## Install

```bash
bun add @svadmin/surface @svadmin/core @svadmin/ui @tanstack/svelte-query svelte zod
```

Import protocol, document, Patch, and action APIs from the DOM-free root entry. Import rendering code from the Svelte subpath.

```ts
import { validateSurfaceSpec, type SurfacePolicy, type SurfaceSpec } from '@svadmin/surface';
import {
  DEFAULT_SURFACE_CATALOG_VERSION,
  SurfaceRenderer,
  defaultSurfaceCatalog,
  defineSurfaceCatalog,
} from '@svadmin/surface/svelte';
```

## Minimal example

```svelte
<script lang="ts">
  import type { SurfacePolicy, SurfaceSpec } from '@svadmin/surface';
  import {
    DEFAULT_SURFACE_CATALOG_VERSION,
    SurfaceRenderer,
  } from '@svadmin/surface/svelte';

  const policy = {
    resources: {
      products: {
        readFields: ['id', 'name', 'stock'],
        sortFields: ['stock'],
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
    widgets: [
      {
        id: 'count',
        type: 'metric',
        props: { label: 'Products', format: 'number' },
        binding: { sourceId: 'products', pointer: '/total' },
        placement: { columnSpan: 3 },
      },
      {
        id: 'stock',
        type: 'bar-chart',
        props: { title: 'Stock', labelField: 'name', valueField: 'stock' },
        binding: { sourceId: 'products', pointer: '/items' },
        placement: { columnSpan: 9 },
      },
    ],
  } satisfies SurfaceSpec;

  let renderer = $state<{
    refresh(sourceId?: string): Promise<void>;
    executeAction(action: unknown): Promise<unknown>;
  }>();
</script>

<button type="button" onclick={() => renderer?.refresh()}>Refresh</button>
<SurfaceRenderer bind:this={renderer} {spec} {policy} liveMode="off" />
```

When rendered inside `AdminApp`, the renderer resolves the configured provider for each resource. A trusted host may instead pass `dataProvider`, which is still narrowed to `getList` and `getOne`. `liveMode` is `off` by default; pass a trusted `liveProvider` and `liveMode="auto"` to invalidate readable resources after live events.

## Documents and revisions

`SurfaceSpec` remains the small `surface/v1` wire contract. Persistence uses a separate immutable `SurfaceDocument` envelope with a monotonically increasing revision, `draft`/`published` stage, timestamp, actor, operation ID, and provenance.

```ts
import {
  createMemorySurfaceStore,
  publishSurfaceDocument,
  saveSurfaceDraft,
  type SurfaceDocumentDependencies,
} from '@svadmin/surface';

const dependencies: SurfaceDocumentDependencies = {
  store: createMemorySurfaceStore(), // examples and tests only
  catalog: defaultSurfaceCatalog,
  policy,
  authorize: async ({ actorId, action }) => hostMayChangeSurface(actorId, action),
};

const draft = await saveSurfaceDraft({
  dependencies,
  scopeId: 'tenant:acme',
  spec,
  expectedRevision: 0,
  actorId: currentUser.id,
  operationId: crypto.randomUUID(),
});

if (draft.ok) {
  await publishSurfaceDocument({
    dependencies,
    scopeId: 'tenant:acme',
    surfaceId: spec.surfaceId,
    expectedRevision: draft.document.revision,
    actorId: currentUser.id,
    operationId: crypto.randomUUID(),
  });
}
```

`saveSurfaceDraft`, `publishSurfaceDocument`, `rollbackSurfaceDocument`, `readSurfaceDocument`, and `listSurfaceDocumentHistory` all return Result values. Rollback appends a new draft copied from a historical revision; it never mutates history. Production `SurfaceStore.append()` implementations must atomically compare `expectedRevision` and append, and should enforce uniqueness for `(scopeId, surfaceId, revision)` and durable audit retention. The included memory store is deliberately non-persistent.

## Bounded Patch and trusted actions

`validateSurfacePatch` accepts only strict `add`, `remove`, `replace`, and `test` operations. It limits operation count and pointer length, rejects dangerous/non-canonical paths, and allows changes only under `/title`, `/layout`, `/dataSources`, and `/widgets`. `previewSurfacePatch` applies the full patch to a clone and reruns `validateSurfaceSpec`; `commitSurfacePatch` additionally re-reads the base revision, authorizes the write, and appends through compare-and-swap.

Actions are trusted runtime registrations, not part of `SurfaceSpec`. `defaultSurfaceActionRegistry` provides `refreshSource`, `setFilter`, `clearFilter`, and `navigateResource`. Filters are checked against `SurfacePolicy`; navigation passes only an allowed resource and record ID to a host callback. Custom actions use strict Zod schemas and must not turn wire input into arbitrary URLs, code, provider calls, or mutations.

```ts
await renderer?.executeAction({
  type: 'setFilter',
  sourceId: 'products',
  filter: { field: 'stock', operator: 'lte', value: 10 },
});
```

Transient actions and live invalidation do not change the persisted `SurfaceSpec`. Hosts explicitly commit a Patch when the configuration itself should change.

## Built-in catalog

| Type | Binding | Purpose |
| --- | --- | --- |
| `metric` | `/total` on `resource-list`, or one readable field on `resource-one` | Numeric KPI |
| `resource-table` | `/items` | Read-only table, at most eight columns |
| `bar-chart` | `/items` | Zero-dependency SVG bar chart |
| `line-chart` | `/items` | Zero-dependency SVG line chart |

The catalog version is `svadmin/v1`. `catalogVersion` must match exactly.

Custom catalogs are trusted runtime configuration. Every registration must use a strict Zod v4 object schema and a trusted Svelte component. Item widgets that read record fields must expose those fields through `getReferencedFields`; validation then checks them against `SurfacePolicy.readFields`.

```ts
const catalog = defineSurfaceCatalog({
  version: 'acme/v1',
  widgets: [{
    type: 'status-list',
    dataKind: 'items',
    propsSchema: z.object({ statusField: z.string() }).strict(),
    getReferencedFields: (props) => [props.statusField as string],
    component: StatusList,
  }],
});
```

## Security boundary

Surface specs are untrusted data. The renderer validates the whole document before sending any query. It rejects unknown components and sources, duplicate or overlong IDs, invalid props, dangerous pointers, mismatched versions, policy violations, and configured limits.

Specs cannot contain HTML, Svelte, JavaScript, event handlers, Tailwind classes, style declarations, colors, URLs, SQL, provider selection, `meta`, arbitrary requests, or mutation actions. Provider records are projected to `readFields`, and selected values containing `Date`, `File`, `BigInt`, functions, cycles, `NaN`, or infinities fail instead of being converted.

The browser access-control check is display gating only. The backend must independently authorize every request and must not trust the spec, policy, projected fields, actor ID, scope ID, or approval decision received from a browser. Document changes additionally require a host-supplied write authorizer; a trusted server should repeat authorization before durable writes.

Limits are eight data sources, 24 widgets, 100 rows per page, eight filters, three sorters, 64-character IDs, 64 levels of JSON nesting, 10,000 JSON nodes, and 64 Patch operations. A source is loaded once and shared. Generation checks discard stale responses. Live payloads are treated only as invalidation hints, are never bound to widgets, and same-tick/in-flight events are coalesced.

Supported Core/UI ranges and the minimum packed-consumer matrix are published in `compatibility.json`.

## Remaining boundaries

SSR/Lite rendering, Canvas, iframe, arbitrary HTML/CSS/code/URLs, actions declared by the Spec, general CRUD mutations, polling, client-side aggregation, dataset snapshots, credentials, and connector scheduling remain out of scope. Aggregated metrics should come from a backend summary resource and bind through `resource-one`.

`@svadmin/surface-agent` adds bounded Patch proposals and explicit human approval; it does not give an Agent access to `SurfaceStore`, `DataProvider`, action handlers, scope/actor selection, or automatic writes.

中文指南见文档站的“声明式 Surface”。
