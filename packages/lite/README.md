# @svadmin/lite

**Lightweight, SSR-compatible admin UI for [@svadmin](https://github.com/vibeunion/svadmin).**

Core server-driven CRUD flows can run without hydration. An optional `enhance.js` asset adds progressive client-side conveniences.

The bundled CSS follows an IE11-oriented baseline, but Svelte 5, SvelteKit, Tailwind-based companion packages, and each consumer's transpilation target determine the final browser support. This package therefore does not make a blanket IE11 compatibility guarantee.

## Why?

The main `@svadmin/ui` package delivers a premium SPA experience using Svelte 5, Tailwind CSS v4, and TanStack. Those tools target modern browsers. Some enterprise/government environments instead prefer server-driven navigation, native forms, and a smaller client-side runtime.

**What Lite is:**
- A **Zero-JS SSR-first admin component suite** designed with an IE11-safe CSS baseline.
- 100% interoperable with `@svadmin/core` — sharing the same `DataProvider`, `AuthProvider`, `Resource`, and `FieldDefinition` contracts.
- An architectural companion to `@svadmin/ui` achieving **100% component parity (103/103 components)** through 1:1 server-rendered matches, deliberate semantic fallbacks, or explicit SPA-only classification.
- **Not** a generic Tailwind-to-IE11 compiler or a full client-side port of shadcn-svelte (which depends on modern browser JS runtimes and CSS custom properties).

`@svadmin/lite` provides a server-rendered fallback that **shares the same DataProvider, AuthProvider, and Resource definitions** — only the rendering layer is different.

## Features

| Feature | How it works |
|---------|-------------|
| **List page** | Server-rendered `<table>` with `<a>` sort links |
| **Detail page** | Key-value layout with type-aware formatting |
| **Create/Edit** | Native `<form method="POST">` with server-side validation |
| **Delete** | Fragment-target confirmation + native POST form, no JS needed |
| **Search** | `<form method="GET">` with `?q=` parameter |
| **Pagination** | Pure `<a>` page links |
| **Authentication pages** | Login/logout plus optional provider-delegating account actions |
| **Auth Guard** | Server hook redirects unauthenticated users |
| **UA Detection** | Optional legacy-browser detection hook redirects users to `/lite/` routes |
| **SPA + IE11 split** | Modern browsers keep the existing SPA; IE11 is redirected before the SPA route is rendered |
| **Capability fallbacks** | Canvas, WASM, realtime, directory upload, observers, storage, media, and other browser-only features have server-safe alternatives |
| **i18n** | Uses `@svadmin/core` `t()` translations |
| **Multi-level Menu** | Always-expanded, config-driven nested links via `MenuItem[]` |
| **Parity Tracking** | Built-in CLI matrix, CI parity verification gate, and live interactive visual showroom |
| **Print** | `@media print` optimized styles |

## Quick Start

### 1. Install

```bash
bun add @svadmin/lite @svadmin/core
```

Use this inside a Svelte 5/SvelteKit application; those runtimes and `@svadmin/core`
are required peers rather than optional dependencies.

### 2. Create a list page

For an existing SvelteKit project, the route tree can be generated once instead
of being handwritten for every resource:

```bash
bunx @svadmin/create lite init .
bunx @svadmin/create lite init . --write
```

The generator adds a shared `$lib/svadmin-lite.ts` adapter and dynamic
`[resource]` list/create/show/edit routes. `$lib/admin` only needs to export
`resources` and `dataProvider`; the existing SPA files are not changed. The
generated Lite subtree is `ssr = true` and `csr = false`, and existing files are
preserved on repeat runs.

```typescript
// src/routes/lite/posts/+page.server.ts
import { createListLoader, createCrudActions } from '@svadmin/lite';
import { dataProvider, resources } from '$lib/admin';

const postsResource = resources.find(r => r.name === 'posts')!;

export const load = createListLoader(dataProvider, postsResource);
export const actions = createCrudActions(dataProvider, postsResource);
```

```typescript
// src/routes/lite/+layout.ts
export const ssr = true;
export const csr = false;
```

Put these options on the `/lite` layout so every child route returns server-rendered
HTML without shipping or executing the Svelte runtime in IE11. See the runnable
[SSR example](https://github.com/vibeunion/svadmin/tree/main/packages/lite/example)
for the complete contract and its real-response check.

```svelte
<!-- src/routes/lite/posts/+page.svelte -->
<script lang="ts">
  import { LiteLayout, LiteTable, LitePagination, LiteSearch, LiteAlert } from '@svadmin/lite';
  import '@svadmin/lite/lite.css';
  import { resources } from '$lib/admin';

  let { data, form } = $props();
</script>

<LiteLayout resources={resources} currentResource="posts" brandName="My Admin">
  <div class="lite-header">
    <h1>{data.resource.label}</h1>
    <a href="/lite/posts/create" class="lite-btn lite-btn-primary">+ Create</a>
  </div>

  {#if form?.success}
    <LiteAlert type="success" message="Operation completed!" />
  {/if}

  <LiteSearch value={data.search} />
  <LiteTable
    records={data.records}
    resource={data.resource}
    currentSort={data.sort}
    currentOrder={data.order}
  />
  <LitePagination page={data.page} totalPages={data.totalPages} />
</LiteLayout>
```

### 2b. Multi-level menu (optional)

Pass a `menu` prop to `LiteLayout` to replace the auto-generated flat resource list with a multi-level sidebar:

```svelte
<script lang="ts">
  import type { MenuItem } from '@svadmin/core';

  const menu: MenuItem[] = [
    { name: 'home', label: 'Dashboard', href: '/lite' },
    {
      name: 'content', label: 'Content',
      children: [
        { name: 'posts', label: 'Posts', href: '/lite/posts' },
        { name: 'categories', label: 'Categories', href: '/lite/categories' },
      ],
    },
    {
      name: 'system', label: 'System',
      children: [
        { name: 'users', label: 'Users', href: '/lite/users' },
        {
          name: 'settings', label: 'Settings',
          children: [
            { name: 'general', label: 'General', href: '/lite/settings/general' },
            { name: 'security', label: 'Security', href: '/lite/settings/security' },
          ],
        },
      ],
    },
    { name: 'docs', label: 'Documentation', href: 'https://docs.example.com', target: '_blank' },
  ];
</script>

<LiteLayout {resources} {menu} currentResource="posts" brandName="My Admin">
  <!-- ... -->
</LiteLayout>
```

`meta.hidden` is honored recursively. For `meta.resource` / `meta.action`, pass a
server-computed synchronous `canAccess(resource, action)` callback; permission checks
that fail or throw are hidden. Nested groups stay expanded so their links remain usable
without JavaScript or native disclosure-element support. API and server actions must
still enforce authorization.

### 2c. Request-scoped providers and tenants

Lite's server utilities consume the same `DataProvider` contract as Core, but they do
not use client hooks. Build tenant-aware providers inside each SvelteKit request so SSR
requests never share tenant state through a module-level mutable variable:

```typescript
// src/routes/lite/posts/+page.server.ts
import { withTenantDataProvider } from '@svadmin/core';
import { createListLoader, createCrudActions } from '@svadmin/lite';
import { dataProvider, postsResource } from '$lib/admin';
import type { Actions, PageServerLoad } from './$types';

function scopedProvider(tenantId: string) {
  return withTenantDataProvider(dataProvider, { tenantId });
}

export const load = ((event) =>
  createListLoader(scopedProvider(event.locals.tenantId), postsResource)(event)
) satisfies PageServerLoad;

function scopedActions(tenantId: string) {
  return createCrudActions(scopedProvider(tenantId), postsResource);
}

export const actions = {
  create: (event) => scopedActions(event.locals.tenantId).create(event),
  update: (event) => scopedActions(event.locals.tenantId).update(event),
  delete: (event) => scopedActions(event.locals.tenantId).delete(event),
} satisfies Actions;
```

Authorization and tenant isolation must still be enforced by the provider/backend; UI
visibility is not an authorization boundary.

### 3. Optionally route legacy browsers to Lite pages

```typescript
// src/hooks.server.ts
import { createLegacyRedirectHook } from '@svadmin/lite';

export const handle = createLegacyRedirectHook('/lite');
```

### 4. Optional legacy-browser metadata

```html
<!-- src/app.html -->
<head>
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="renderer" content="webkit">
  <meta charset="utf-8">
</head>
```

### 5. Keep the SPA untouched while routing IE11 to Lite

The redirect belongs to the server hook or reverse proxy. It does not add a
compatibility branch, polyfill, or user-agent check to the SPA bundle:

```typescript
// src/hooks.server.ts
import { createLegacyRedirectHook } from '@svadmin/lite';

export const handle = createLegacyRedirectHook({
  litePrefix: '/lite',
  spaPrefix: '/admin',
  // Static assets, health checks, and API routes stay outside document routing.
  exclude: ['/api', '/_app', '/health'],
});
```

For a request such as `/admin/orders/show/7`, an IE11 user receives a 302 to
`/lite/orders/show/7`. Modern browsers continue to the existing SPA route.
The Lite subtree must remain `ssr = true` and `csr = false`; the browser never
executes Svelte 5 there.

If the application is behind a reverse proxy, the same rule can be implemented
there instead. The important property is that the SPA JavaScript is not sent to
IE11 before the decision is made.

## Components & Parity (100% Coverage)

`@svadmin/lite` provides **100% component parity** (103/103 components) corresponding to `@svadmin/ui`. See [PARITY.md](./PARITY.md) for the generated complete matrix and status details.

### Core Pages & Layout

| Component | Description |
|-----------|-------------|
| `LiteLayout` | Responsive sidebar + header + main shell (supports nested `menu` links) |
| `LiteSidebar` / `LiteHeader` | Discrete layout primitives |
| `LiteListPage` | Full-featured list view with search, table, bulk actions, and pagination |
| `LiteCreatePage` / `LiteEditPage` | Auto-generated CRUD form pages |
| `LiteShowPage` | Key-value record view with typed field renderers |
| `LiteMasterDetailView` | URL-synchronized master/detail workspace |
| `LitePrintableBill` | Controlled A4-style printable business record |
| `LitePdfDocumentViewer` | Embedded PDF review with document stamp and annotation support |
| `LiteProfilePage` | User profile management page with avatar and info |
| `LiteRegisterPage` | User registration page with server-side validation |
| `LiteForgotPasswordPage` / `LiteUpdatePasswordPage` | Password recovery and credential rotation flows |
| `LiteTable` | HTML table with sort links, selectable rows, and delete confirmation |
| `LiteForm` | Schema-driven form renderer supporting all field definitions |
| `LiteShow` | Detailed field-by-field record viewer |
| `LitePagination` / `LiteSearch` | URL-driven pagination and GET search controls |
| `LiteAlert` | Inline notification banner for success/error/warning states |
| `LiteBreadcrumbs` / `LiteTabs` / `LiteEmptyState` | Semantic navigation and placeholder primitives |
| `LiteCanAccess` / `LiteErrorBoundary` | Server-side access gate and constrained-environment error boundary |
| `LiteSplitPaneLayout` / `LiteMultiTabKeepAlive` | Dense two-pane layouts and multi-workspace navigation |

### Field Components (33 Fields)

| Category | Components |
|----------|------------|
| **Text & Numeric** | `LiteTextField`, `LiteNumberField`, `LiteCurrencyField`, `LitePercentField`, `LitePhoneField`, `LiteEmailField`, `LiteUrlField`, `LiteRatingField`, `LiteCopyField` |
| **Date & Choice** | `LiteDateField`, `LiteDateRangeField`, `LiteBooleanField`, `LiteSelectField`, `LiteMultiSelectField`, `LiteTreeSelect`, `LiteCascader`, `LiteTagField`, `LiteRelationField` |
| **Media & Rich & Array** | `LiteAvatarField`, `LiteImageField`, `LiteFileField`, `LiteCodeField`, `LiteMarkdownField`, `LiteRichTextField`, `LiteJsonField`, `LiteArrayField`, `LiteDynamicFormList`, `LiteTransfer`, `LiteImageCropper`, `LiteJsonSchemaForm`, `LiteMentionsInput`, `LiteSignaturePad` |
| **SPA-only** | `VoiceInput` (Web Speech API; no SSR counterpart) |

### Action Buttons (10 Buttons)

| Component | Description |
|-----------|-------------|
| `LiteListButton`, `LiteCreateButton`, `LiteEditButton`, `LiteShowButton`, `LiteCloneButton` | Server-rendered `<a>` navigation buttons |
| `LiteDeleteButton` | Fragment-target modal confirmation with native POST form action |
| `LiteSaveButton`, `LiteRefreshButton`, `LiteExportButton`, `LiteImportButton` | Form submission, page refresh, and file action buttons |

### Widgets & Charts (SSR-Safe)

| Component | Description |
|-----------|-------------|
| `LiteStatsCard`, `LiteInsightCard`, `LiteAnomalyBadge` | Metric KPI cards and status badges |
| `LiteBarChart`, `LiteLineChart`, `LitePieChart` | Server-rendered SVG/HTML charts with fallback data tables |
| `LitePresenceAvatarGroup`, `LiteGanttChart`, `LiteOfflineSyncBanner` | Presence, schedule, and offline mutation status rendered without client hydration |

### Compatibility & Degradation Primitives

| Component | Description |
|-----------|-------------|
| `LiteCapabilityBoundary` | Documents and selects a server-safe fallback for an optional browser capability |
| `LiteVisualFallback` | Snapshot plus accessible table for Canvas, WebGL, map, chart, and flow UIs |
| `LiteDirectoryUpload` | Directory enhancement with multiple-file and ZIP upload fallbacks |
| `LiteRealtimeStatus` | Snapshot timestamp and native refresh/meta-refresh fallback for live data |
| `LiteComputeFallback` | Native POST action for WASM, Worker, and long-running compute fallback |
| `LiteOrderedList` | Up/down POST actions for drag-and-drop ordering fallback |
| `LiteClipboardFallback` | Selectable textarea when Clipboard API is unavailable |
| `LiteAutoSaveIndicator` | Server persistence timestamp indicator |
| `LiteInlineEdit` | Non-JS inline edit modal fallback |
| `LiteModalForm` / `LiteDrawerForm` | Fragment-target `#modal` forms for zero-JS popups |
| `LiteVirtualTable` | Graceful fallback to server-paginated table |
| `LiteDraggableHeader` | Static column header with URL sorter links |
| `LiteToast` / `LiteUndoableNotification` | Server-driven flash messages and undo actions |
| `LiteFilterBuilder` | Native multi-rule CRUD filter builder with AND/OR logical operators |
| `LiteConfirmDialog`, `LiteWatermark`, `LiteColumnSettings`, `LiteImportWizard` | Server-safe confirmation, watermark, column, and import workflows |
| `LiteColumnHeaderFilter`, `LiteTreeTable`, `LiteSensitiveDataMask`, `LiteApprovalActionCard` | Query, hierarchy, masking, and approval fallbacks |
| `LiteStepForm`, `LiteTableSummary`, `LiteVersionDiffViewer`, `LiteEditableTable`, `LiteDraggableRowTable` | Server-driven enterprise data interaction components |
| `LiteMediaLibraryModal`, `LiteActivityFeed`, `LiteKanbanBoard`, `LitePivotTable` | Media, activity, workflow, and analysis views |
| `LiteCanvasAnnotation`, `LiteSpreadsheetView`, `LiteDecisionTable` | SSR-compatible annotation, spreadsheet, and rules views |
| `DevTools`, `CopilotPanel` | SPA-only components with no Lite counterpart |

## Parity Tracking & Visualization

To monitor and maintain 100% component parity between `@svadmin/ui` and `@svadmin/lite`:

- **CLI Dashboard**: Run `bun run check:parity` to inspect the live coverage matrix in terminal.
- **Parity Matrix Document**: [PARITY.md](./PARITY.md) is auto-generated with exhaustive module-by-module tables.
- **Machine-Readable JSON**: `packages/lite/parity.json` provides structured data for automation.
- **Interactive Showroom**: Visit `/lite/parity` in the example app to interactively preview all 103 components and live metrics.
- **CI Contract Test**: `scripts/parity-contract.test.ts` runs in CI to prevent regression and ensure every new UI component has a documented Lite counterpart.

## Server Utilities

| Function | Description |
|----------|-------------|
| `createListLoader(dp, resource)` | SvelteKit `load` function for list pages |
| `createDetailLoader(dp, resource)` | SvelteKit `load` function for detail pages |
| `createCrudActions(dp, resource)` | SvelteKit form actions for create/update/delete |
| `createAuthGuard(authProvider)` | Server hook for authentication |
| `createAuthActions(authProvider)` | Login/logout actions plus optional provider-delegating account actions |
| `createLegacyRedirectHook()` | Auto-redirect IE11 to `/lite/` |
| `fieldsToTypeBoxSchema(fields)` | Generate the TypeBox schema used by Lite actions or other consumers (with `fieldsToZodSchema` alias) |

## CSS

Import `@svadmin/lite/lite.css` in your layout. It's fully self-contained:
- IE11-oriented CSS baseline (standard flexbox, no CSS variables, Grid, or `gap`)
- Custom-styled checkboxes, radios, and selects (no `appearance: none` needed)
- Indigo/Slate color system aligned with `@svadmin/ui`
- Modern focus rings (`box-shadow` based)
- Smooth transitions on all interactive elements
- Multi-layer translucent shadows
- Print-optimized styles
- ~800 lines, ~19KB unminified

This CSS baseline helps older browsers, but the generated Svelte/SvelteKit application and any Tailwind v4 UI used alongside Lite still require the browser targets configured by those tools (Tailwind v4 itself targets modern browsers).

## Optional: Progressive Enhancement

Copy the exported `@svadmin/lite/enhance.js` asset to your application's static folder. This ES5 script adds:
- Auto-close fragment-target confirmations when clicking outside
- Auto-focus first form input
- Unsaved changes warning

The asset is optional for core server-rendered navigation and form submission; the conveniences listed above require it.

## Capability compatibility

The compatibility catalog is exported as `LITE_COMPATIBILITY_CATALOG`, with
`detectLiteCapabilities()` and `resolveLiteCompatibility()` for explicit client
enhancement entries. The detector accepts an injected environment, so SSR tests
do not need browser globals:

```typescript
import {
  detectLiteCapabilities,
  resolveLiteCompatibility,
} from '@svadmin/lite';

const support = detectLiteCapabilities(globalThis);
const realtime = resolveLiteCompatibility('websocket', support);
```

Do not import this detector into the modern SPA just to make IE11 work. The SPA
stays modern. Use it only in an optional Lite enhancement entry or a modern-only
Lite page. The normal Lite route requires no detector and no hydration.

Recommended fallback contract:

| Modern capability | Required Lite fallback |
|---|---|
| Canvas/WebGL/flow/map/chart | Static image or SVG plus a structured data table and download |
| WASM/Worker | Server action or background job with status and downloadable result |
| WebSocket/SSE | Snapshot timestamp, refresh link, optional polling or meta refresh |
| Directory/File System Access | Multiple files, relative paths where available, or ZIP upload |
| Virtual scrolling/IntersectionObserver | Server pagination or eager server rendering |
| Drag and drop | Ordered list with up/down POST actions |
| Clipboard API | Selectable text area and normal browser copy command |
| IndexedDB/localStorage | Server persistence for authoritative data; local cache only for preferences |
| Notifications/Media Capture/WebRTC | In-page status, file upload, or server-managed workflow |

These fallbacks preserve the business operation, submitted data, read access,
download, and auditability. They do not attempt to reproduce every modern
interaction pixel-for-pixel.

### Third-party library boundaries

Do not patch these libraries into the IE11 document. Keep them in the modern SPA
and render the matching Lite fallback from shared records or server projections:

| Modern library family | Examples | Lite boundary |
|---|---|---|
| Flow/canvas/3D | `@xyflow/svelte`, Three.js, Fabric.js | `LiteVisualFallback` with nodes, edges, properties, snapshot, and export |
| Charts | ECharts, Chart.js, Vega | Lite chart components or `LiteVisualFallback` with a data table |
| Maps | MapLibre, Leaflet | Address/coordinate table, static map image, and external navigation link |
| Editors | Monaco, CodeMirror, TipTap | `textarea`, Markdown, source download, and server validation |
| Realtime clients | native WebSocket/EventSource, Socket.IO | `LiteRealtimeStatus`, refresh, polling endpoint, or server status page |
| File-system helpers | `browser-fs-access` | `LiteDirectoryUpload` and normal download links |
| Browser storage | `idb`, `idb-keyval`, localForage | Server persistence; browser cache only for drafts and preferences |
| Virtual table/drag libraries | TanStack Virtual, SortableJS | Server pagination and `LiteOrderedList` actions |
| PDF/media terminals | PDF.js, MediaRecorder, WebRTC, xterm.js | Download/upload, transcript/log view, and server workflow |

Dependency patch systems such as Bun `patchedDependencies` or `patch-package`
should only repair a reproducible package defect, such as an eager `window`
reference or incorrect package export. They must not be used to pretend that an
unavailable browser capability exists. Every retained patch needs an exact
package version, a regression test, and a documented removal condition.

## Compatibility notes

- Registration, recovery, password, and profile actions delegate the submitted form
  fields to the corresponding optional `AuthProvider` method. Provider-specific recovery
  flows that require tokens, user IDs, secrets, old passwords, or callback URLs need a
  custom route/form; Lite does not infer those values from callback query parameters.
- `createListLoader` returns both flat URL-state fields (`page`, `pageSize`, `sort`,
  `order`, `search`) and the aliases accepted by `LiteListPage` (`pagination`,
  `currentSort`, `currentOrder`, `currentSearch`). The default page size matches Core: 10.
- `image` and `images` use the same URL-string values as `@svadmin/ui`; `file` is the
  native upload field. Server validation continues to accept existing Lite image-file
  submissions for migration compatibility.
- Buttons such as import/export/chat provide SSR UI and route contracts only. Consumers
  must implement the corresponding loader or form action for their backend.
- IE11 can consume server-rendered HTML and the optional ES5 enhancement layer, with
  native links/forms and the IE11-safe Lite CSS contract. Keep the entire Lite route
  subtree on `ssr = true` and `csr = false`; Svelte 5 hydration/runtime execution in
  IE11 is not supported or promised by this package.
- The SPA is not an IE11 target. The supported architecture is `modern SPA +
  server-routed Lite`, where server middleware decides which document bundle is
  returned before the browser executes application JavaScript.
- Third-party polyfills are optional host concerns. `@vitejs/plugin-legacy`,
  `core-js`, Fetch/EventSource polyfills, and `browser-fs-access` can improve a
  modern-only enhancement entry, but they are not Lite core dependencies and do
  not replace a server fallback for Canvas, WebSocket protocol support, WASM, or
  File System Access.

## License

MIT
