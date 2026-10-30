---
title: Lite SSR & Parity Architecture
description: Zero-JS server-rendered admin fallback, IE11-safe CSS baseline, and 100% component parity
---

`@svadmin/lite` provides a server-rendered, Zero-JS administrative UI fallback that shares the exact same `DataProvider`, `AuthProvider`, `Resource`, and `FieldDefinition` contracts with `@svadmin/core` and `@svadmin/ui`.

It is tailored for enterprise, government, and legacy environments requiring server-driven navigation, native HTML forms, and an IE11-compatible CSS baseline without shipping client-side JavaScript runtimes.

---

## Architectural Essence: What Lite Is (and Is Not)

To maintain clarity across modern SPA and fallback boundaries, it is crucial to understand what Lite actually represents:

| Question | Lite Architecture Reality |
|---|---|
| **Is it a Tailwind-to-IE11 compiler?** | **No.** Tailwind v4 targets modern browsers and relies on modern CSS features. Lite bundles an independent, self-contained `lite.css` (~19KB) written in standard CSS flexbox with **zero CSS variables, zero Grid, and zero modern pseudo-selectors** (`:is()`, `:where()`, `:has()`, `:focus-visible`). |
| **Is it a shadcn-svelte port?** | **No.** shadcn-svelte relies on client-side JS hydration, Bitless/Melt primitives, dynamic popover portals, and modern CSS variables. Lite replaces these with **native semantic HTML elements** (`<form method="POST">`, `<a>`, `<select>`, `<input type="...">`) and fragment-target `#modal` overlays. |
| **Is it just IE11-compatible components?** | **Yes, and more.** It is a complete server-driven admin rendering engine that executes on the server (SvelteKit SSR with `csr = false`), outputting clean, accessible HTML that any browser (including legacy IE11) can render without client JavaScript. |
| **Can / should it be extracted to a separate repo?** | **No.** Keeping `@svadmin/lite` inside the svadmin Monorepo guarantees **100% contract synchronization with `@svadmin/core`**, prevents schema/loader drift, and ensures automated end-to-end CI validation. |

---

## Component System & Inventory Parity

The current inventory classifies **179/179 entries** as direct counterparts, semantic fallbacks, or SPA-only components.
Inventory coverage is not release acceptance, so track the three numbers below instead: exact-counterpart rate,
fallback rate, and how many mapped components are referenced by a behavior test.

### Parity Breakdown by Module

```
===============================================================
       @svadmin/ui <-> @svadmin/lite Parity Status
===============================================================
  [fields]        46/46 (100.0%)  [##############]
  [buttons]       10/10 (100.0%)  [##############]
  [pages]          18/18 (100.0%)  [##############]
  [layout]        25/25 (100.0%)  [##############]
  [widgets]       37/37 (100.0%)  [##############]
  [advanced]      43/43 (100.0%)  [##############]
---------------------------------------------------------------
  Inventory Coverage: 100% (179/179)
  - 1:1 Exact Matches: 110 (61.5%)
  - Semantic Fallbacks: 67 (37.4%)
  - SPA-Only (No SSR Needed): 2
  - Missing: 0
  Behavior Verified: 132/179 (73.7%)
===============================================================
```


`LiteQRCode` is an opt-in subpath export because it statically imports the optional `qrcode` peer. The root entry stays importable without that package; install it and import the component directly only when QR rendering is used:

```ts
import LiteQRCode from '@svadmin/lite/components/LiteQRCode.svelte';
```

### Component Categories

1. **Pages & Views (18 Components)**:
   - `LiteListPage`, `LiteCreatePage`, `LiteEditPage`, `LiteShowPage`, `LiteLogin`, `LiteRegisterPage`, `LiteForgotPasswordPage`, `LiteUpdatePasswordPage`, `LiteProfilePage`, `LiteMasterDetailView`, `LitePrintableBill`, `LitePdfDocumentViewer`, `LitePagination`, `LiteSkeleton`.
2. **Field & Complex Select Components (46 Components)**:
   - **Text & Numeric**: `LiteTextField`, `LiteNumberField`, `LiteCurrencyField`, `LitePercentField`, `LitePhoneField`, `LiteEmailField`, `LiteUrlField`, `LiteRatingField`, `LiteCopyField`.
   - **Choice & Relations**: `LiteBooleanField`, `LiteDateField`, `LiteDateRangeField`, `LiteSelectField`, `LiteMultiSelectField`, `LiteTreeSelect`, `LiteCascader`, `LiteTagField`, `LiteRelationField`.
   - **Rich Media & Arrays**: `LiteAvatarField`, `LiteImageField`, `LiteFileField`, `LiteJsonField`, `LiteArrayField`, `LiteDynamicFormList`, `LiteTransfer`, `LiteImageCropper`, `LiteJsonSchemaForm`, `LiteMentionsInput`, `LiteSignaturePad`.
   - **Semantic Fallbacks**: `LiteCodeField`, `LiteMarkdownField`, `LiteRichTextField`, `LiteFileUpload`.
   - **Verification & suggestions**: `LiteOtpInput`, `LiteTwoFactorStepper`, `LiteAutoComplete`.
3. **Action Buttons (10 Buttons)**:
   - `LiteListButton`, `LiteCreateButton`, `LiteEditButton`, `LiteShowButton`, `LiteCloneButton` (native `<a>` links).
   - `LiteDeleteButton` (fragment-target confirmation modal + native POST form).
   - `LiteSaveButton`, `LiteRefreshButton`, `LiteExportButton`, `LiteImportButton`.
4. **Layout & Navigation (25 Components)**:
   - `LiteLayout`, `LiteSidebar`, `LiteHeader`, `LiteBreadcrumbs`, `LiteCanAccess`, `LiteErrorBoundary`, `LiteSplitPaneLayout`, `LiteMultiTabKeepAlive`.
   - `LitePageHeader`, `LiteStatusTabs`, `LiteMenu`, `LiteAnchor`, `LiteAffix`, `LiteCollapse`, `LiteLink`, `LiteSpace`, `LiteGrid`, `LiteResizeBox`, `LiteFloatButton`, `LiteBackTop`, `LitePagination`.
   - `ThemeToggle` is explicitly SPA-only; `LiteTabs` and `LiteEmptyState` remain available as SSR primitives but are not counted as parity entries.
5. **Widgets & Charts (37 Components)**:
   - `LiteStatsCard`, `LiteMetricStrip`, `LiteAnomalyBadge`, `LiteBadge`, `LiteTag`, `LiteStatusBadge`, `LiteItemList`, `LiteStatistic`, `LiteCountdown`, `LiteTimeline`, `LiteCalendar`, `LiteCarousel`, `LiteImage`, `LiteImagePreview`, `LiteVideoPlayer`, `LiteQRCode`, `LiteMediaThumbnail`, `LiteSkeleton`, `LiteSpin`, `LiteProgress`.
   - `LiteBarChart`, `LiteLineChart`, `LitePieChart`, `LiteAreaChart`, `LiteScatterChart`, `LiteRadarChart`, `LiteGaugeChart`, `LiteFunnelChart`, `LiteHeatmapChart`, `LiteWaterfallChart`, `LiteRoseChart`, `LiteDonutChart`, `LitePresenceAvatarGroup`, `LiteGanttChart`, `LiteOfflineSyncBanner` (server-rendered SVG/HTML or bounded data-table fallbacks).
   - `LiteInsightCard` remains available as a Lite-only SSR primitive and is not counted in the `@svadmin/ui` parity matrix.
6. **Advanced UX Degradations & Query (43 Components)**:
   - `LiteTable` with optional sticky edge/action columns.
   - `LiteConfirmDialog`, `LiteFilterBuilder`, `LiteDrawerForm`, `LiteModalForm`, `LiteVirtualTable` (native table fallback without SPA virtualization; paginate or bound data on the server).
   - `LiteInlineEdit`, `LiteAutoSaveIndicator`, `LiteToast`, `LiteUndoableNotification` (semantic server-driven fallbacks).
   - `LiteWatermark`, `LiteColumnSettings`, `LiteImportWizard`, `LiteColumnHeaderFilter`, `LiteTreeTable`, `LiteSensitiveDataMask`, `LiteApprovalActionCard`.
   - `LiteTreeTable` renders the whole supplied hierarchy. It does not implement SPA expansion, selection, mixed checkboxes or hierarchical keyboard navigation; validate and bound the tree on the server.
   - `LiteStepForm`, `LiteTableSummary`, `LiteVersionDiffViewer`, `LiteEditableTable`, `LiteDraggableRowTable`, `LiteMediaLibraryModal`, `LiteActivityFeed`.
   - `LiteKanbanBoard`, `LitePivotTable`, `LiteCanvasAnnotation`, `LiteSpreadsheetView`, `LiteDecisionTable`.
   - `LiteSpreadsheetView` is a bounded native form fallback. Formula calculation, sheet navigation and exports must be handled by the server, not a client-side spreadsheet engine.
   - `LiteCommentThread`, `LiteTour`, `LiteNotificationCenter`, `LiteDetailDrawer`, `LitePopconfirm`, `LiteRowActions`, `LiteTree`, `LiteResult` provide server-rendered collaboration, disclosure and navigation fallbacks.
   - `DevTools` is explicitly SPA-only and has no Lite counterpart.

---

## Dual-Track Architecture

The recommended pattern is **Dual-Track Deployment**: modern browsers use the full `@svadmin/ui` SPA, while legacy browsers or low-bandwidth environments are routed to `@svadmin/lite`.

```
           [ Incoming User Request ]
                      |
           [ SvelteKit Server Hook ]
                      |
         +------------+------------+
         |                         |
   Modern Browser            Legacy Browser (IE11)
         |                         |
  /admin/* (SPA)            /lite/* (SSR, Zero-JS)
  @svadmin/ui               @svadmin/lite
  Svelte 5 + Tailwind v4    Server HTML + lite.css
```

> **SvelteKit 3**: `$lib` was replaced by the `#lib` subpath imports. Declare them in `package.json` (SvelteKit 2 projects can run `npx sv migrate sveltekit-3`):
>
> ```json
> { "imports": { "#lib": "./src/lib/index.js", "#lib/*": "./src/lib/*" } }
> ```

### 1. Configure the Lite Subtree

In your Lite route layout, enforce server-only rendering:

```typescript
// src/routes/lite/+layout.ts
export const ssr = true;
export const csr = false;
```

### 2. Add Server-Side Route Handlers

```typescript
// src/routes/lite/posts/+page.server.ts
import { createListLoader, createCrudActions } from '@svadmin/lite';
import { dataProvider, resources } from '#lib/admin.js';

const postsResource = resources.find(r => r.name === 'posts')!;

export const load = createListLoader(dataProvider, postsResource);
export const actions = createCrudActions(dataProvider, postsResource);
```

### 3. Render the Page

```svelte
<!-- src/routes/lite/posts/+page.svelte -->
<script lang="ts">
  import { LiteLayout, LiteTable, LitePagination, LiteSearch, LiteAlert } from '@svadmin/lite';
  import '@svadmin/lite/lite.css';
  import { resources } from '#lib/admin.js';

  let { data, form } = $props();
</script>

<LiteLayout resources={resources} currentResource="posts" brandName="My Admin">
  <div class="lite-header">
    <h1>{data.resource.label}</h1>
    <a href="/lite/posts/create" class="lite-btn lite-btn-primary">+ Create</a>
  </div>

  {#if form?.success}
    <LiteAlert type="success" message="Operation completed successfully!" />
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

### 4. Automatic Legacy Redirection

```typescript
// src/hooks.server.ts
import { createLegacyRedirectHook } from '@svadmin/lite';

export const handle = createLegacyRedirectHook({
  litePrefix: '/lite',
  spaPrefix: '/admin',
  exclude: ['/api', '/_app', '/health'],
});
```

---

## Capability Fallbacks & Boundaries

For complex browser capabilities that cannot run in zero-JS or legacy environments, Lite provides clear, server-safe alternatives:

| Modern Capability | Modern SPA Tool | Lite Zero-JS Fallback |
|---|---|---|
| **Flow / Graph** | `@xyflow/svelte` | `LiteVisualFallback` (SVG preview + node/edge table) |
| **Charts** | ECharts / Chart.js | `LiteBarChart` / `LiteLineChart` (SVG + data table) |
| **Code Editor** | Monaco / CodeMirror | `LiteCodeField` (`<pre><code>` + `<textarea>`) |
| **Rich Text** | TipTap / ProseMirror | `LiteRichTextField` (Sanitized HTML + `<textarea>`) |
| **Realtime Updates** | WebSocket / SSE | `LiteRealtimeStatus` (Timestamp + reload links / polling) |
| **Clipboard** | `navigator.clipboard` | `LiteCopyField` / `LiteClipboardFallback` (Selectable text) |
| **File Drag & Drop** | Native DND API | `LiteDirectoryUpload` / Standard file inputs |

---

## Parity Tracking & CI Gates

To guarantee that future development never introduces feature gaps between `@svadmin/ui` and `@svadmin/lite`:

1. **CLI Dashboard**:
   ```bash
   bun run check:parity
   ```
2. **Matrix Documentation**: Check [packages/lite/PARITY.md](https://github.com/vibeunion/svadmin/blob/main/packages/lite/PARITY.md) for live per-component mapping and status notes.
3. **Interactive Showroom**: Run the example app and navigate to `/lite/parity` to preview all 179 components live in both Light and Dark themes.
4. **Automated CI Contract Test**: `scripts/parity-contract.test.ts` validates that all exported UI components are tracked in the parity matrix during `bun run test`.
