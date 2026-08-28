# @svadmin/surface

`@svadmin/surface` renders a small, versioned JSON contract as a trusted Svelte dashboard. It is an optional browser package and does not change the public contract of `@svadmin/core`.

The MVP supports Svelte 5 + Vite, a fixed 12-column grid, four built-in widgets, read-only `DataProvider` queries, explicit access checks, field projection, and manual host refresh.

## Install

```bash
bun add @svadmin/surface @svadmin/core @svadmin/ui @tanstack/svelte-query svelte @sinclair/typebox
```

Import protocol types and validation from the DOM-free root entry. Import rendering code from the Svelte subpath.

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

  let renderer = $state<{ refresh(sourceId?: string): Promise<void> }>();
</script>

<button type="button" onclick={() => renderer?.refresh()}>Refresh</button>
<SurfaceRenderer bind:this={renderer} {spec} {policy} />
```

When rendered inside `AdminApp`, the renderer resolves the configured provider for each resource. A trusted host may instead pass `dataProvider`, which is still narrowed to `getList` and `getOne`.

## Built-in catalog

| Type | Binding | Purpose |
| --- | --- | --- |
| `metric` | `/total` on `resource-list`, or one readable field on `resource-one` | Numeric KPI |
| `resource-table` | `/items` | Read-only table, at most eight columns |
| `bar-chart` | `/items` | Zero-dependency SVG bar chart |
| `line-chart` | `/items` | Zero-dependency SVG line chart |

The catalog version is `svadmin/v1`. `catalogVersion` must match exactly.

Custom catalogs are trusted runtime configuration. Every registration must use a strict TypeBox object schema and a trusted Svelte component. Item widgets that read record fields must expose those fields through `getReferencedFields`; validation then checks them against `SurfacePolicy.readFields`.

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

The browser access-control check is display gating only. The backend must independently authorize every request and must not trust the spec, policy, or projected fields received from a browser.

MVP limits are eight data sources, 24 widgets, 100 rows per page, eight filters, three sorters, 64-character IDs, 64 levels of JSON nesting, and 10,000 JSON nodes. A source is loaded once and shared. Generation checks discard stale responses.

Supported Core/UI ranges and the minimum packed-consumer matrix are published in `compatibility.json`.

## Out of scope for v1

SSR/Lite, Agent generation, storage, revisions, JSON Patch, actions, mutations, automatic refresh, arbitrary URLs, client aggregation, Canvas, and iframe rendering are intentionally absent. Aggregated metrics should come from a backend summary resource and bind through `resource-one`.

中文指南见文档站的“声明式 Surface”。
