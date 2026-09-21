# @svadmin/surface

`@svadmin/surface` renders a versioned JSON contract as a trusted Svelte dashboard. It is an optional package and does not change the public contract of `@svadmin/core`.

`surface/v1` supports Svelte 5 + Vite, a fixed 12-column grid, four built-in widgets, read-only `DataProvider` queries, explicit access checks, field projection, and manual host refresh. Optional AI helpers derive generation contracts from the component catalog and support revision-checked edit proposals.

## Install

The declared minimum combination is Core 0.53.0, UI 0.73.0, and Svelte
5.56.10, matching the published UI peer requirements. `compatibility.json`
lists verification targets, not proof of a successful run. Acceptance requires
the `minimum-supported` strict install and consumer checks in `pack:check` to
pass against registry artifacts; workspace tarballs do not replace that check.

```bash
bun add @svadmin/surface @svadmin/core @svadmin/ui @tanstack/svelte-query svelte @sinclair/typebox
```

Import protocol types and validation from the DOM-free root entry. Import rendering code from the Svelte subpath. Hosts do not need CSS compiler plugins to consume the package's static component styles.

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
  import { DEFAULT_SURFACE_CATALOG_VERSION, SurfaceRenderer } from '@svadmin/surface/svelte';

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

The renderer follows the active `AdminApp` i18n locale. Built-in loading, empty, error, boolean, number, currency, percent, and date presentation updates automatically. A standalone host can pass `locale` and override built-in strings with `messages`. Business copy such as titles, labels, and column headers remains part of the JSON spec.

```svelte
<SurfaceRenderer {spec} {policy} locale="zh-CN"
  messages={{ tableNoRecords: '没有符合条件的记录' }} />
```

## Incremental loading and session boundaries

Title, layout, widget ordering, equivalent JSON and locale-only changes reuse unchanged source results and in-flight reads. Query, projection-policy or provider changes reload only affected sources. `refresh(sourceId)` forces one source and `refresh()` forces all sources. Stale replies and errors are ignored after replacement, removal or destruction; this is logical cancellation, not a transport `AbortSignal` guarantee.

Stable widget IDs and component types preserve local input state during visual edits. Removed/retyped widgets can remount. A changed trusted `scopeKey` or `dataScopeKey` clears source identity and remounts local widget state; observable logout, tenant, authentication and access-control identities are also tracked. Hosts must update a non-secret scope token when opaque credentials/session state changes, and discard pending AI proposals on account or tenant changes. These properties are not model-controlled fields. Presentation changes are no longer implicit data refresh or reauthorization signals.

## AI generation contracts

Catalog definitions can include `description` and schema-validated `examples`. The root exports `createSurfaceCatalogManifest()` and `createSurfaceAgentResponseSchema()` for model adapters. Inline, closed TypeBox object schemas are supported; transforms and schema references fail explicitly rather than silently weakening the generated contract.

```ts
import {
  buildSurfaceAgentMessages,
  parseSurfaceAgentResponse,
  selectSurfaceCatalog,
} from '@svadmin/surface';
import { defaultSurfaceCatalog } from '@svadmin/surface/svelte';

const catalog = selectSurfaceCatalog(defaultSurfaceCatalog, ['metric', 'resource-table']);
const messages = buildSurfaceAgentMessages('Generate an inventory dashboard', catalog, policy);
// Send messages through a trusted model adapter. Never expose model credentials.
const response = parseSurfaceAgentResponse(modelText, catalog, policy);
if (response.ok && response.value.action === 'propose') {
  // Preview response.value.spec and require explicit approval before applying it.
} else if (response.ok) {
  // Render response.value.message as text: this is a cannot-fulfill response.
}
```

Use the same task-scoped catalog for generation, validation and rendering. JSON Schema narrows generation but does not replace cross-source binding checks, field policy or server authorization. The schema is not claimed to match every vendor's restricted structured-output subset.

`buildSurfaceAgentPrompt()` and `parseSurfaceAgentProposal()` remain compatible with the legacy proposal-only `surface-agent/v1` envelope. The new message API uses `surface-agent/v2` with a structured `cannot-fulfill` alternative. `createSurfaceAgentStream()` buffers bounded text and validates at `finish()`; it does **not** render partial JSON or implement OpenUI Lang streaming.

## Revisioned edits and explicit preview

`createSurfaceRevision()` creates a validated immutable snapshot. `buildSurfaceEditMessages()` describes the current revision, catalog and allowed operations. `applySurfaceEditProposal()` validates a complete `surface-edit/v1` transaction and returns a new candidate revision without mutating the old one. Operations cover title/layout, widget/source upsert/removal and complete widget reordering by stable ID. Stale `baseRevision`, unknown IDs, invalid props, denied fields and broken final references reject the whole transaction.

The Svelte `SurfaceEditPreview` component accepts a controlled revision and untrusted proposal:

```svelte
<SurfaceEditPreview
  {revision}
  {proposal}
  {streaming}
  {policy}
  {catalog}
  {dataProvider}
  scopeKey={trustedSessionRevision}
  density="comfortable"
  onApply={applyApprovedRevision}
/>
```

It leaves the current surface intact during streaming, offers a separate preview/back action, and revalidates at the explicit apply click. It calls `onApply(candidate)` only for a valid proposal. The host performs any persistence with server authorization and atomic revision compare-and-swap, then updates `revision` and clears `proposal`. Missing handlers, invalid proposals and pending callbacks disable application. A rejected callback reports an error without changing the controlled revision. Changing scope does not authorize an old proposal: the host must discard old proposals as described above.

Preview controls use local finite class helpers and maintained static CSS. `@svadmin/surface/editor.css` remains available for explicit CSS collection. Density/button variants and complete-color semantic CSS variable overrides are preserved. Widgets use local semantic recipes to retain compatibility with older UI peers; no UI-generated helpers are copied during build. The separate `@svadmin/surface/styles.css` entry remains available and rendering components also import it automatically; see `STYLING.md`.

## Built-in catalog

| Type | Binding | Purpose |
| --- | --- | --- |
| `metric` | `/total` on `resource-list`, or one readable field on `resource-one` | Numeric KPI |
| `resource-table` | `/items` | Read-only table, at most eight columns |
| `bar-chart` | `/items` | Zero-dependency SVG bar chart |
| `line-chart` | `/items` | Zero-dependency SVG line chart |

The catalog version is `svadmin/v1`. `catalogVersion` must match exactly. Custom registrations use strict TypeBox props schemas and trusted Svelte components. Item widgets reading record fields must expose them through `getReferencedFields` so runtime validation checks `SurfacePolicy.readFields`.

```ts
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

const statusProps = Type.Object({ statusField: Type.String() }, { additionalProperties: false });
const catalog = defineSurfaceCatalog({
  version: 'acme/v1',
  widgets: [{
    type: 'status-list',
    description: 'Display a policy-authorized status field from resource items.',
    dataKind: 'items',
    propsSchema: statusProps,
    getReferencedFields: (props) => [Value.Decode(statusProps, props).statusField],
    component: StatusList,
  }],
});
```

## Security boundary

Surface specs are untrusted data. The renderer validates the whole document before sending any query. It rejects unknown components/sources, duplicate or overlong IDs, invalid props, dangerous pointers, mismatched versions, policy violations, and configured limits.

Specs cannot contain executable HTML, Svelte, JavaScript, event handlers, class names, style declarations, colors, URLs, SQL, provider selection, `meta`, arbitrary requests, or mutation actions. Provider records are projected to `readFields`. Selected values containing `Date`, `File`, `BigInt`, functions, cycles, `NaN`, or infinities fail instead of being converted.

The browser access-control check is display gating only. The backend must independently authorize every request and must not trust a spec, client policy or projected fields as proof of authority. AI and edit helpers neither contact a model nor execute business writes. Persistence, audit records, model transport and approval policy belong to the host.

Limits are eight data sources, 24 widgets, 100 rows per page, eight filters, three sorters, 64-character IDs, 64 levels of JSON nesting, and 10,000 JSON nodes. AI text/request/contract sizes and edit operation counts are separately bounded by their exported limit constants. Supported Core/UI ranges and packed-consumer requirements are published in `compatibility.json`.

## Current boundaries

Actual OpenUI Lang parsing, nested interactive forms, registered business actions, server persistence, SSR/Lite rendering, arbitrary URLs, client aggregation, Canvas and iframe execution are not implemented. Aggregated metrics should come from a policy-authorized backend summary resource and bind through `resource-one`. The current UI contract remains read-only even though its definition can be edited.

See `docs/architecture/openui-surface-phase2.md` for the original feature scope and `docs/architecture/surface-integration-provenance.md` for historical integration evidence. 中文指南见文档站的“声明式 Surface”。
