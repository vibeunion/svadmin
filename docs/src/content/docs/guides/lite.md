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

## Component System & 100% Parity

`@svadmin/lite` achieves **100% component parity (72/72 components)** with `@svadmin/ui`. Every component in the modern SPA has either a 1:1 server-rendered equivalent or a defined semantic fallback.

### Parity Breakdown by Module

```
===============================================================
       @svadmin/ui <-> @svadmin/lite Parity Status
===============================================================
  [fields]        29/29 (100.0%)  [##############]
  [buttons]       10/10 (100.0%)  [##############]
  [pages]           9/9 (100.0%)  [##############]
  [layout]          7/7 (100.0%)  [##############]
  [widgets]         6/6 (100.0%)  [##############]
  [advanced]      11/11 (100.0%)  [##############]
---------------------------------------------------------------
  Overall Coverage: 100% (72/72)
  - 1:1 Exact Matches: 55
  - Semantic Fallbacks: 13
  - SPA-Only (No SSR Needed): 4
  - Missing: 0
===============================================================
```

### Component Categories

1. **Pages & Views (9 Components)**:
   - `LiteListPage`: Server-paginated table with search, sort links, and bulk delete.
   - `LiteCreatePage` / `LiteEditPage`: TypeBox schema-validated server forms.
   - `LiteShowPage`: Read-only key-value detail view.
   - `LiteProfilePage` / `LiteRegisterPage`: Profile and registration forms.
   - `LiteForgotPasswordPage` / `LiteUpdatePasswordPage`: Auth credential workflows.
2. **Field & Complex Select Components (29 Components)**:
   - **Text & Numeric**: `LiteTextField`, `LiteNumberField`, `LiteCurrencyField`, `LitePercentField`, `LitePhoneField`, `LiteEmailField`, `LiteUrlField`, `LiteRatingField`, `LiteCopyField`.
   - **Choice & Relations**: `LiteBooleanField`, `LiteDateField`, `LiteDateRangeField`, `LiteSelectField`, `LiteMultiSelectField`, `LiteTreeSelect`, `LiteCascader`, `LiteTagField`, `LiteRelationField`.
   - **Rich Media & Arrays**: `LiteAvatarField`, `LiteImageField`, `LiteFileField`, `LiteJsonField`, `LiteArrayField`, `LiteDynamicFormList`, `LiteTransfer`.
   - **Semantic Fallbacks**: `LiteCodeField` (`<pre><code>` block), `LiteMarkdownField` (pure HTML/Textarea), `LiteRichTextField` (sanitized read-only/Textarea).
3. **Action Buttons (10 Buttons)**:
   - `LiteListButton`, `LiteCreateButton`, `LiteEditButton`, `LiteShowButton`, `LiteCloneButton` (native `<a>` links).
   - `LiteDeleteButton` (fragment-target confirmation modal + native POST form).
   - `LiteSaveButton`, `LiteRefreshButton`, `LiteExportButton`, `LiteImportButton`.
4. **Layout & Navigation (7 Components)**:
   - `LiteLayout`, `LiteSidebar`, `LiteHeader`, `LiteBreadcrumbs`, `LiteTabs`, `LiteEmptyState`.
5. **Widgets & Charts (6 Components)**:
   - `LiteStatsCard`, `LiteInsightCard`, `LiteAnomalyBadge`.
   - `LiteBarChart`, `LiteLineChart`, `LitePieChart` (server-rendered SVG/HTML charts with fallback data tables).
6. **Advanced UX Degradations & Query (11 Components)**:
   - `LiteModalForm` / `LiteDrawerForm`: Zero-JS `#modal` CSS fragment-target dialogs.
   - `LiteVirtualTable`: Graceful fallback to server-paginated tables.
   - `LiteAutoSaveIndicator`, `LiteInlineEdit`, `LiteDraggableHeader`, `LiteToast`, `LiteFilterBuilder`.

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
import { dataProvider, resources } from '$lib/admin';

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
  import { resources } from '$lib/admin';

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
3. **Interactive Showroom**: Run the example app and navigate to `/lite/parity` to preview all 72 components live in both Light and Dark themes.
4. **Automated CI Contract Test**: `scripts/parity-contract.test.ts` validates that all exported UI components are tracked in the parity matrix during `bun run test`.
