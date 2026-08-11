---
title: Declarative Surface
description: Render policy-constrained JSON dashboards with trusted Svelte components
---

`@svadmin/surface` is an optional browser package for dashboards and operational views that are more flexible than generated CRUD pages. It accepts a versioned JSON document, validates the complete document, performs read-only resource queries, and renders only components registered by the host.

It does not modify `@svadmin/core`, generate Svelte code, or turn svadmin into a general BI query engine.

## Boundaries

- Root import `@svadmin/surface`: JSON-safe protocol types and `validateSurfaceSpec`.
- Svelte import `@svadmin/surface/svelte`: `SurfaceRenderer`, default catalog, and `defineSurfaceCatalog`.
- Data access: `Pick<DataProvider, 'getList' | 'getOne'>` only.
- Built-ins: `metric`, `resource-table`, `bar-chart`, and `line-chart`.
- Layout: validated 12-column grid with semantic gaps and spans.

The MVP supports client-side Svelte 5 + Vite. SSR/Lite, actions, storage, Agent input, automatic refresh, client aggregation, Canvas, and iframes are not supported.

```bash
bun add @svadmin/surface @svadmin/core @svadmin/ui @tanstack/svelte-query svelte zod
```

## Public API

| Import | API | Purpose |
| --- | --- | --- |
| `@svadmin/surface` | `validateSurfaceSpec`, `SURFACE_SCHEMA_VERSION`, protocol and policy types | DOM-free validation and wire contract |
| `@svadmin/surface/svelte` | `SurfaceRenderer`, `defaultSurfaceCatalog`, `defineSurfaceCatalog` | Browser rendering and trusted component registration |

`validateSurfaceSpec(input, catalog, policy)` returns a serializable result instead of throwing for ordinary validation failures. The renderer accepts `spec: unknown` and repeats the complete validation before any query, so import tools and editors can preflight a document without creating a second security boundary.

## Render a surface

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

  let renderer = $state<{ refresh(sourceId?: string): Promise<void> }>();
</script>

<button type="button" onclick={() => renderer?.refresh()}>Refresh</button>
<SurfaceRenderer bind:this={renderer} {spec} {policy} />
```

Inside `AdminApp`, each source uses the provider configured for its resource. A trusted host can pass a provider explicitly for tests or standalone embedding.

`refresh(sourceId?)` is a trusted host API. Refresh capability is not part of `SurfaceSpec`, and refreshing data does not recreate the spec or widget DOM.

## Policy and authorization

`SurfacePolicy` is required. For each resource, declare `readFields`, `filterFields`, `sortFields`, `allowGetOne`, and `maxPageSize` as needed. The renderer rejects the complete surface before querying if the spec references a resource or field outside the policy.

Before a query, the current `AccessControlProvider` receives `list` or `show`. This browser check controls presentation only. The backend must independently authenticate and authorize every request.

Provider results are projected to `readFields` before widgets receive them. Non-JSON selected values fail without conversion.

## Extend the catalog

Custom catalogs are trusted executable configuration, not wire data. Register a strict Zod v4 props schema and a trusted Svelte component with `defineSurfaceCatalog`. Item widgets must declare any record fields selected by their props through `getReferencedFields`, so validation can apply the field policy.

Never register a component that accepts raw HTML, CSS, classes, colors, URLs, event handlers, dynamic imports, or arbitrary request parameters from its props.

## Threat model

Treat every spec as untrusted, including AI-generated and database-loaded JSON. The default boundary rejects unknown types, duplicate IDs, mismatched versions, invalid props, dangerous JSON Pointers, forbidden presentation keys, excessive nodes or queries, and policy violations. Validation failure sends zero resource queries.

MVP limits: eight data sources, 24 widgets, 100 records per page, eight filters, three sorters, 64-character IDs, 64 levels of JSON nesting, and 10,000 JSON nodes. Sources are deduplicated by ID, and generation checks discard stale responses.

Aggregations such as revenue totals belong in a backend summary resource. Bind that resource with `resource-one`; do not calculate a business total from one paginated browser response.

## Compatibility and roadmap

The package publishes its supported Core/UI/Svelte ranges and tested minimum combination in `compatibility.json`. Packed-consumer checks cover the DOM-free Node ESM entry and the Svelte/Vite entry.

The v1 wire contract stays deliberately small. Candidate follow-ups are revision history and JSON Patch, an application-supplied persistence/audit interface, and an opt-in Agent adapter with human approval. Dataset snapshots, credentials, aggregation, and connector scheduling remain backend or application responsibilities. Canvas, iframe, arbitrary code, and mutation actions are not implicit roadmap commitments.
