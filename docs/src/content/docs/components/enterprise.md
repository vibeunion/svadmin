---
title: Enterprise Components
description: Enterprise admin building blocks for RBAC, audit views, tenant switching, task queues, identity governance, sessions, and credentials.
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

svadmin ships reusable **enterprise admin building blocks** for real-world back offices. The components and provider contracts are not, by themselves, a compliance certification or a complete identity platform. Most components follow the **Headless + Wrapper** pattern:

- **Layer A (Headless)**: Pure UI components driven by Props + Callbacks — zero backend coupling
- **Layer B (Wrapper)**: Optional integration with `AuthProvider` for out-of-the-box experience

## Production boundary

`AdminApp` accepts a typed `ProviderBundle` for tree-scoped backend capabilities:

```svelte
<script lang="ts">
  import { createProviderBundle } from '@svadmin/core';
  import { AdminApp } from '@svadmin/ui';

  const providerBundle = createProviderBundle({
    dataProvider,
    authProvider,
    accessControlProvider,
    auditLogProvider,
    organizationProvider,
    identityGovernanceProvider,
    sessionProvider,
    credentialProvider,
  });
</script>

<AdminApp {providerBundle} {resources} />
```

The built-in enterprise settings pages fail closed when their provider is absent. They do not generate browser-only API keys, fake sessions, or simulated persistence. `CredentialProvider` secrets are returned only by `createApiCredential`; list operations expose metadata only.

Every organization, identity-governance, session, and credential provider method receives an `EnterpriseRequestContext`. It contains the active tree's `tenantId` plus optional `requestId`, `traceId`, and tenant metadata. Providers must use that context to scope every backend request; a singleton provider may safely serve multiple `AdminApp` tenant contexts only when its adapter enforces this parameter.

The trusted backend remains responsible for authentication, authorization, tenant isolation, secret hashing and rotation, webhook delivery, idempotency, rate limiting, retention enforcement, and durable audit storage. Credential, session, identity-policy, and role mutations should write their business change and audit record in one backend transaction or equivalent atomic workflow. UI callbacks and `writeAuditEntry()` cannot make two independent remote writes atomic.

## Product maturity boundaries

Exporting a component does not mean the product capability is complete. The enterprise product uses these delivery boundaries:

These tiers describe targets and acceptance gates, not completed releases. Focused tests prove only their covered scenarios; API freeze, complete type checks, browser acceptance, publication, and online acceptance require separate evidence.

The machine-readable boundary is exported from `@svadmin/core` as
`ENTERPRISE_MATURITY`: P0 is `stable`, P1 is `verified`, and P2 remains
`experimental` or `planned`. This prevents an export count from being mistaken
for complete product delivery.

| Tier | Product commitment | Current acceptance bar |
|---|---|---|
| P0 stable delivery | App shell, resource CRUD, tables and forms, permission and tenant governance, import/export, audit, and Provider/SSR/Lite foundations | Public APIs are frozen; direct behavior, type, and SSR/Lite tests exist; failures never fabricate success |
| P1 verified capability | Advanced tables, saved views, import wizard, task queue, approvals, version diff, dashboard, and multi-tab workspace | Focused UI/Core/Lite coverage exists; tenant, Provider, async receipt, and error boundaries are verified |
| P2 extension modules | Kanban, Gantt, Pivot, Spreadsheet, decision tables, PDF, printing, signatures, annotations, media, collaboration, and offline sync | Optional and scenario-driven; does not block P0/P1 and does not promise complete domain backends or equal Lite behavior by default |

P2 components may be used, but their status should be managed as `experimental` or `planned` until the relevant API, SSR/Lite, integration, and online acceptance work is complete. No tier means that browser components automatically provide authentication, authorization, tenant isolation, or durable audit storage.

## Enterprise Interaction Catalog

The current UI and Lite releases include the following enterprise-oriented building blocks. Each listed Lite component is SSR-safe and is either a direct server-rendered counterpart or an explicitly documented semantic fallback. The full status matrix is generated in `packages/lite/PARITY.md`.

| Area | SPA component | Lite counterpart | Intended use |
|---|---|---|---|
| Data entry | `StepForm`, `ModalForm`, `DrawerForm` | `LiteStepForm`, `LiteModalForm`, `LiteDrawerForm` | Multi-step, modal, and drawer-based workflows |
| Data tables | `VirtualTable`, `EditableTable`, `DraggableRowTable`, `TableSummary`, `TreeTable` | Matching `Lite*` components | Large datasets, inline editing, ordering, summaries, and hierarchy |
| Query and import | `ColumnSettings`, `ColumnHeaderFilter`, `ImportWizard`, `JsonSchemaForm` | Matching `Lite*` components | Column selection, server-side filters, imports, and schema-driven forms |
| Governance | `ApprovalActionCard`, `SensitiveDataMask`, `VersionDiffViewer`, `Watermark` | Matching `Lite*` components | Approval actions, redaction, version review, and document marking |
| Work management | `ActivityFeed`, `KanbanBoard`, `GanttChart`, `MultiTabKeepAlive` | Matching `Lite*` components | Activity streams, boards, schedules, and multi-workspace navigation |
| Media and documents | `MediaLibraryModal`, `ImageCropper`, `PdfDocumentViewer`, `PrintableBill` | Matching `Lite*` components | Asset selection, image preparation, PDF review, and printable records |
| Collaboration | `MentionsInput`, `PresenceAvatarGroup`, `OfflineSyncBanner` | Matching `Lite*` components | Mentions, presence state, and pending offline mutations |
| Analysis and rules | `PivotTable`, `DecisionTable`, `CanvasAnnotation`, `SpreadsheetView`, `SignaturePad` | Matching `Lite*` components | Analysis, rule evaluation, annotations, spreadsheets, and signatures |
| Layout | `SplitPaneLayout` | `LiteSplitPaneLayout` | Detail inspectors and dense two-pane admin screens |

`DevTools` remains explicitly SPA-only because it depends on browser-side developer interaction. AI interaction components now live in `@svadmin/ai-elements` and are outside the `@svadmin/ui` ↔ `@svadmin/lite` matrix.

The components above are headless building blocks. Their callbacks must be connected to authenticated, tenant-scoped backend operations; rendering a button or form does not itself authorize or persist a business mutation.

---

## PermissionMatrix

A fully decoupled RBAC permission matrix for managing `(Role × Resource × Action)` relationships.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `roles` | `RoleInfo[]` | Role list (`{ code, name }`) |
| `resources` | `ResourceInfo[]` | Resource list, supports `section` grouping |
| `actions` | `ActionInfo[]` | Action definitions (CRUD, etc.) |
| `isGranted` | `(role, resource, action) => boolean` | External authorization check function |
| `selectedRole` | `$bindable<string>` | Currently selected role (two-way binding) |
| `onToggle` | `(role, resource, action, grant) => void` | Permission change callback |
| `sidebarExtra` | `Snippet` | Left sidebar extension slot |
| `headerExtra` | `Snippet` | Top toolbar extension slot |
| `loading` | `boolean` | Disable interactions while loading |

### Usage

```svelte
<script>
  import { PermissionMatrix } from '@svadmin/ui';

  let policies = $state([]);

  function checkGrant(role, resource, action) {
    return policies.some(p => p.role === role && p.res === resource && p.act === action);
  }

  async function handleToggle(role, res, act, grant) {
    await fetch('/api/permissions', {
      method: 'POST',
      body: JSON.stringify({ role, res, act, grant })
    });
  }
</script>

<PermissionMatrix
  roles={[{ code: 'admin', name: 'Administrator' }, { code: 'editor', name: 'Editor' }]}
  resources={[{ code: 'posts', name: 'Posts', section: 'Content' }]}
  actions={[{ code: 'read', name: 'Read' }, { code: 'write', name: 'Write' }]}
  isGranted={checkGrant}
  onToggle={handleToggle}
>
  {#snippet sidebarExtra()}
    <p>Tenant: Acme Corp</p>
  {/snippet}
</PermissionMatrix>
```

### Built-in Settings Integration

The `<RolesSettings />` component wraps `PermissionMatrix` with `AuthProvider` integration. It is automatically available at `/settings/roles` when you use `<SettingsPage />`.

To enable it, implement these optional methods on your `AuthProvider`:

```ts
const authProvider: AuthProvider = {
  // ... login, logout, check, getIdentity ...
  getRoles: async () => [{ id: '1', name: 'Admin' }],
  getRolePermissions: async (roleId) => ({ posts: ['create', 'read'] }),
  updateRolePermissions: async (roleId, permissions) => ({ success: true }),
};
```

---

## AuditLogViewer

An audit log viewer with search filtering, action badges, and an integrated snapshot drawer for viewing JSON diffs. Compliance depends on the backend's append-only storage, access controls, retention enforcement, integrity protection, and operational evidence.

### AuthProvider Integration

```ts
const authProvider: AuthProvider = {
  getAuditLogs: async ({ page, pageSize }) => ({
    data: [
      { id: '1', userName: 'admin', action: 'update', resource: 'users',
        createdAt: new Date(), ipAddress: '192.168.1.1',
        details: { before: { name: 'Old' }, after: { name: 'New' } } }
    ],
    total: 100,
  }),
};
```

Available at `/settings/audit` automatically in `<SettingsPage />`.

---

## TenantSwitcher

A zero-refresh multi-tenant workspace switcher built for Sidebar integration.

```svelte
<script>
  import { TenantSwitcher } from '@svadmin/ui';

  const tenants = [
    { id: '1', name: 'Acme Corporation', logo: '/acme.png' },
    { id: '2', name: 'Beta Industries' },
  ];

  let currentTenantId = $state('1');

  function handleSwitch(id: string) {
    // Reload data for new tenant context
    location.href = `?tenant=${id}`;
  }
</script>

<!-- Place at the top of Sidebar -->
<TenantSwitcher
  {tenants}
  bind:currentTenantId
  onSwitch={handleSwitch}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `tenants` | `Tenant[]` | List of available tenants |
| `currentTenantId` | `$bindable<string>` | Active tenant ID |
| `collapsed` | `boolean` | Adapts to sidebar collapsed state |
| `onSwitch` | `(tenantId) => void` | Switch callback |
| `headerSnippet` | `Snippet` | Dropdown header slot (for search/create) |

---

## TaskQueueDrawer

A background task center showing real-time progress, status indicators, and download/retry actions.

```svelte
<script>
  import { TaskQueueDrawer } from '@svadmin/ui';
  import { createClient } from '@supabase/supabase-js';
  import { createSupaCloudClient } from '@supacloud/js';
  import { createSupaCloudTaskProvider } from '@svadmin/supabase/supacloud';

  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  const supacloud = createSupaCloudClient({
    supabase,
    managementApiUrl: import.meta.env.VITE_SUPACLOUD_API_URL,
    projectRef: import.meta.env.VITE_SUPACLOUD_PROJECT_REF,
  });
  const taskProvider = createSupaCloudTaskProvider({ supacloud });

  let drawerOpen = $state(false);
</script>

<TaskQueueDrawer
  bind:open={drawerOpen}
  {taskProvider}
/>
```

`TaskQueueDrawer` is now a first-class task center powered directly by `TaskProvider`. It includes task and DLQ tabs, filtering, auto-refresh, inline task submission, and a synced detail panel out of the box.

---

## DraggableGrid

A zero-dependency drag-and-drop grid for customizable dashboard layouts using native HTML5 Drag & Drop.

```svelte
<script>
  import { DraggableGrid, type GridModule } from '@svadmin/ui';

  let modules = $state<GridModule[]>([
    { id: 'revenue', title: 'Revenue' },
    { id: 'users', title: 'Active Users' },
    { id: 'orders', title: 'Recent Orders' },
  ]);

  function saveOrder(ids: string[]) {
    localStorage.setItem('dashboard_order', JSON.stringify(ids));
  }
</script>

<DraggableGrid bind:modules onOrderSave={saveOrder}>
  {#snippet renderItem({ module, dragging })}
    <div class="p-4 border rounded-lg bg-card {dragging ? 'opacity-50' : ''}">
      <h3>{module.title}</h3>
    </div>
  {/snippet}
</DraggableGrid>
```

---

## CanAccess / Can

Declarative permission gate component. Renders children only if the current user has access.

```svelte
<script>
  import { CanAccess } from '@svadmin/ui';
</script>

<CanAccess resource="posts" action="delete">
  <button>Delete Post</button>
  {#snippet fallback()}
    <button disabled>No Permission</button>
  {/snippet}
</CanAccess>
```

> `Can` is an alias for `CanAccess` for shorter syntax.

---

## ArrayField

Dynamic nested form field for one-to-many relationships (e.g., order items, contact details).

### Schema Definition

```ts
const fields: FieldDefinition[] = [
  {
    key: 'items',
    label: 'Order Items',
    type: 'array',
    subFields: [
      { key: 'name', label: 'Product', type: 'text', required: true },
      { key: 'quantity', label: 'Qty', type: 'number', required: true },
      { key: 'price', label: 'Price', type: 'number' },
    ],
  },
];
```

`ArrayField` is automatically rendered by `AutoForm` when `type: 'array'` is specified.

## Approval & Workflow Process Tracking

Enterprise administrative workflows (e.g. contract approvals, expense reimbursements, operational sign-offs) require transparent node status and auditor timeline records.

### `<ApprovalTimeline>`

Displays multi-step sequential or parallel approval progression with approver roles, timestamps, comments, and semantic states (`approved`, `rejected`, `running`, `pending`).

```svelte
<script lang="ts">
  import { ApprovalTimeline } from '@svadmin/ui';

  const steps = [
    {
      id: 'step-1',
      title: 'Submit Application',
      approverName: 'Alice Initiator',
      status: 'approved',
      time: '2026-11-10 09:00',
      comment: 'Initial submission verified.',
    },
    {
      id: 'step-2',
      title: 'Manager Review',
      approverName: 'Bob Manager',
      approverRole: 'Department Lead',
      status: 'running',
    },
  ];
</script>

<ApprovalTimeline {steps} />
```

### `<WorkflowProcessCard>`

Complete business process card combining instance metadata, ticket code, initiator, overall status badge, and embedded timeline.

```svelte
<script lang="ts">
  import { WorkflowProcessCard } from '@svadmin/ui';

  const steps = [
    { id: '1', title: 'Submit', approverName: 'Alice', status: 'approved' },
    { id: '2', title: 'Audit', approverName: 'Bob', status: 'running' },
  ];
</script>

<WorkflowProcessCard
  title="Expense Reimbursement Approval"
  processCode="WF-202611-009"
  initiatorName="Alice Finance"
  status="running"
  {steps}
/>
```

## Organization Picker & Tree Transfer

Complex enterprise authorization, role assignment, and organization workflows often require hierarchical department navigation and transfer selection.

### `<TreeTransfer>`

Two-pane transfer component with tree-structured source data, search filtering, batch selection, and customizable target keys.

```svelte
<script lang="ts">
  import { TreeTransfer } from '@svadmin/ui';

  const treeData = [
    {
      key: 'dept-1',
      title: 'Engineering',
      children: [
        { key: 'eng-frontend', title: 'Frontend Team' },
        { key: 'eng-backend', title: 'Backend Team' },
      ],
    },
  ];

  let targetKeys = $state<string[]>(['eng-frontend']);
</script>

<TreeTransfer data={treeData} bind:targetKeys />
```

### `<OrgTreePicker>`

Specialized organizational personnel picker combining department tree navigation, search indexing, multi-member selection, and instant summary badges.

```svelte
<script lang="ts">
  import { OrgTreePicker } from '@svadmin/ui';

  const departments = [
    {
      id: 'd-1',
      name: 'Operations',
      members: [
        { id: 'u-1', name: 'John Doe', email: 'john@example.com', role: 'Lead' },
      ],
    },
  ];

  let selectedMembers = $state<string[]>([]);
</script>

<OrgTreePicker {departments} bind:selectedMemberIds={selectedMembers} />
```

## Enterprise Data Hub: CSV & Pivot Drilldown

Enterprise users frequently exchange bulk tabular data through Excel-compatible CSV exports or drill down into aggregated metrics.

### `<ExcelImportWizard>`

Three-step CSV data onboarding wizard featuring file dropzone parsing, automatic column-to-field matching, row validation, error highlighting, and download templates.

```svelte
<script lang="ts">
  import { ExcelImportWizard } from '@svadmin/ui';

  const fields = [
    { name: 'sku', label: 'SKU Code', required: true },
    { name: 'price', label: 'Unit Price', type: 'number' },
  ];
</script>

<ExcelImportWizard {fields} onimport={(rows) => console.log(rows)} />
```

### `<ExcelExportButton>`

Streamlined CSV/TSV data export button supporting static data arrays or lazy async data fetching providers with loading states.

```svelte
<script lang="ts">
  import { ExcelExportButton } from '@svadmin/ui';

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Customer Name' },
  ];
  const dataSource = [{ id: '1', name: 'Acme Corp' }];
</script>

<ExcelExportButton {columns} {dataSource} filename="customers-export" />
```

### `<PivotDrilldownModal>`

Multidimensional analytic slice drilldown modal showing the active filter criteria, paginated record list, and quick export.

```svelte
<script lang="ts">
  import { PivotDrilldownModal } from '@svadmin/ui';

  let open = $state(true);
  const filters = [{ dimension: 'Region', value: 'APAC' }];
  const columns = [{ key: 'revenue', label: 'Revenue' }];
  const data = [{ revenue: '$1,200,000' }];
</script>

<PivotDrilldownModal bind:open {filters} {columns} {data} />
```

## Visual Containers & Micro-Interactions

### `<Ribbon>`

Attaches contextual status ribbons (success, warning, error, info) to card corners without modifying inner content layouts.

```svelte
<script lang="ts">
  import { Ribbon, Card } from '@svadmin/ui';
</script>

<Ribbon text="PRO" status="primary">
  <Card class="p-6">Subscription Details</Card>
</Ribbon>
```

### `<FloatButtonGroup>`

Configurable floating action buttons with expandable options, quick triggers, and back-to-top actions.

```svelte
<script lang="ts">
  import { FloatButtonGroup } from '@svadmin/ui';
</script>

<FloatButtonGroup trigger="hover" position="bottom-right" />
```

### `<ProSkeleton>`

Specialized skeleton loaders tailored for enterprise dashboards, tables, analytic metric cards, and multi-step forms.

```svelte
<script lang="ts">
  import { ProSkeleton } from '@svadmin/ui';
</script>

<ProSkeleton type="result" active />
```

## Enterprise Safe-Delete & Bot Verification Suite

### `<SafeDeleteConfirm>` / `<DoubleCheckModal>`

High-risk destructive operations guard (e.g. cluster termination, tenant wipe, schema drops):
- Requires exact typing of the resource identifier to unlock the confirm button.
- Built-in paste prevention (`preventPaste=true`) to stop muscle-memory confirmation.
- Cascading impact assessment list (`impactList`) summarizing affected child entities.
- Mandatory cooldown countdown (`countdown=3`) before unlock.

```svelte
<script lang="ts">
  import { SafeDeleteConfirm } from '@svadmin/ui';

  let showDeleteModal = $state(false);

  async function handleDelete() {
    await fetch('/api/clusters/prod-east-01', { method: 'DELETE' });
  }
</script>

<SafeDeleteConfirm
  bind:open={showDeleteModal}
  targetName="prod-east-01"
  title="Terminate Production Cluster"
  countdown={3}
  preventPaste={true}
  impactList={[
    { label: 'Attached Volumes', count: 12 },
    { label: 'Active Replica Sets', count: 4 },
  ]}
  onconfirm={handleDelete}
/>
```

### `<SliderCaptcha>`

Pure client-side Canvas and CSS jigsaw puzzle captcha for anti-bot rate-limiting on sensitive operations, authentication, or exports:
- Procedural gradient background and puzzle piece clipping with zero external assets.
- Jigsaw piece snap verification with configurable tolerance.
- Trajectory and time bounds analysis (`minTimeMs`) to reject instant automated scripts.

```svelte
<script lang="ts">
  import { SliderCaptcha } from '@svadmin/ui';

  function handleCaptchaSuccess({ token, elapsedMs }: { token: string; elapsedMs: number }) {
    console.log('Verified token:', token, 'Time taken:', elapsedMs);
  }
</script>

<SliderCaptcha
  width={320}
  height={160}
  minTimeMs={200}
  onsuccess={handleCaptchaSuccess}
/>
```

## Enterprise Audit Trail & Revision Diff Suite

### `<AuditLogDrawer>` & `<AuditTimeline>`

High-resolution audit log inspection and field-level diff viewer:
- Slide-over drawer connecting directly to `auditLogProvider` or custom loaders.
- Action filtering (`create`, `update`, `delete`, `approve`, `rollback`) and user/record keyword search.
- Automatic field diff calculation comparing `previousData` and `data` (strikethrough old value in red, highlight new value in green).
- Displays operator identity, action badges, and origin IP address.

```svelte
<script lang="ts">
  import { AuditLogDrawer, Button } from '@svadmin/ui';

  let open = $state(false);
</script>

<Button onclick={() => open = true}>View Audit History</Button>

<AuditLogDrawer
  bind:open
  resource="orders"
  recordId="101"
/>
```

## Real-Time Collaboration & Concurrent Edit Conflict Guard

### `<PresenceAvatars>` / `<PresenceAvatarGroup>`

Visual indicator of concurrent viewers and active editors on a shared record or workspace:
- Overlapping avatar cluster with smooth hover micro-animations.
- Online pulse indicators for active editing status (`editing`, `viewing`, `idle`).
- Configurable maximum visible avatars with `+N` overflow pill.

```svelte
<script lang="ts">
  import { PresenceAvatars } from '@svadmin/ui';

  const users = [
    { id: 'u1', name: 'Alice Guo', role: 'Lead Architect', status: 'editing' },
    { id: 'u2', name: 'Bob Smith', role: 'Maintainer', status: 'viewing' },
  ];
</script>

<PresenceAvatars {users} maxCount={4} size="md" />
```

### `<ConcurrentConflictModal>`

Optimistic locking edit conflict resolver dialog:
- Surfaces when background or WebSocket notifications detect concurrent updates on the same record.
- Interactive side-by-side diff matrix comparing local changes vs server state.
- Flexible resolution strategy: force overwrite, discard local changes, or cherry-pick fields to merge.

```svelte
<script lang="ts">
  import { ConcurrentConflictModal } from '@svadmin/ui';

  let conflictOpen = $state(false);

  const conflictFields = [
    { field: 'title', label: 'Title', localValue: 'My Edit', remoteValue: 'Server Update' },
    { field: 'price', label: 'Price', localValue: 2499, remoteValue: 2699 },
  ];

  function handleMerge(mergedData: Record<string, unknown>) {
    console.log('Applying merged fields:', mergedData);
  }
</script>

<ConcurrentConflictModal
  bind:open={conflictOpen}
  {conflictFields}
  modifiedBy="Bob Smith"
  onresolve={handleMerge}
/>
```

## Enterprise Walkthrough, Metrics & Signature Suite

### `<TourGuide>` / `<Tour>`

Step-by-step product walkthrough and onboarding tour with spotlight masking, floating positioning, and skip memory:
- Pure SVG viewport cutout mask with spotlight backdrop around targeted DOM elements, preventing backdrop click-through.
- Viewport edge overflow protection and adaptive floating positioning.
- Local storage persistence (`storageKey`) so users are not prompted again once dismissed or completed.
- Full keyboard navigation (`Tab`, `Escape`, `ArrowLeft`, `ArrowRight`) with focus trapping.

```svelte
<script lang="ts">
  import { TourGuide } from '@svadmin/ui';

  let showTour = $state(true);

  const steps = [
    { target: '#search-box', title: 'Global Search', description: 'Quickly find resources across workspaces.' },
    { target: '#export-btn', title: 'Export Data', description: 'Download audit trails and tabular reports in CSV or Excel.' },
  ];
</script>

<TourGuide
  bind:open={showTour}
  {steps}
  storageKey="onboarding_v1_done"
  onfinish={() => console.log('Tour finished')}
/>
```

### `<TrendIndicator>` / `<Trend>`

Semantic KPI and reporting trend indicator capsule for dashboards, revenue, and latency metrics:
- Auto-computed percentage changes when given `value` and `prevValue`.
- Direct numeric or string delta formatting with customizable precision, prefix, suffix, and explicit sign formatting (`showSign`).
- Color reversal (`reverseColor=true`) for inverted metrics where downward trends are positive (e.g., error rate, p99 latency).
- Design system semantic tokens (`variant="text" | "badge" | "solid" | "icon"`).

```svelte
<script lang="ts">
  import { TrendIndicator } from '@svadmin/ui';
</script>

<!-- Auto percentage calculation -->
<TrendIndicator value={1250} prevValue={1000} prefix="YoY" variant="badge" />

<!-- Inverted color semantics for error rate -->
<TrendIndicator value={-12.4} reverseColor={true} variant="solid" />

<!-- Compact icon-only variant with tooltip -->
<TrendIndicator value={8.5} variant="icon" prefix="MoM" />
```

### `<SignaturePad>`

High-fidelity handwritten digital signature canvas for approvals, audits, and compliance workflows:
- Smooth quadratic Bezier curve stroke interpolation for natural calligraphy feel.
- State history stack with Undo, Redo, and one-click Clear operations.
- Export to transparent PNG Data URL (`toDataURL()`) or SVG vector markup (`toSVG()`).
- Optional tamper-evident verification timestamp watermark (`withTimestamp`).
- Responsive DPI scaling and touch-friendly pointer interactions.

```svelte
<script lang="ts">
  import { SignaturePad } from '@svadmin/ui';

  let signatureData = $state('');

  function handleSave(dataUrl: string) {
    console.log('Saved signature data URL length:', dataUrl.length);
  }
</script>

<SignaturePad
  bind:value={signatureData}
  width={480}
  height={180}
  withTimestamp={true}
  onsave={handleSave}
/>
```

## Enterprise Tree, Cron & Organization Hierarchy Suite

### `<VirtualTreeSelect>`

High-performance hierarchical tree select component with virtual scrolling for massive datasets:
- Flattens deep hierarchical trees with O(1) depth-first traversal and dynamic expansion state tracking.
- Slices visible window items in real-time, rendering smoothly with tens of thousands of nodes.
- Full keyword search filtering with automatic ancestor chain expansion.
- Supports single and multiple selection modes with cascading check/indeterminate states, tags display, and clear controls.

```svelte
<script lang="ts">
  import { VirtualTreeSelect } from '@svadmin/ui';

  let selected = $state<string[]>([]);

  const treeData = [
    {
      value: 'hq',
      label: 'Headquarters',
      children: [
        { value: 'eng', label: 'Engineering', children: [
          { value: 'fe', label: 'Frontend' },
          { value: 'be', label: 'Backend' },
        ]},
        { value: 'ops', label: 'Operations' },
      ],
    },
  ];
</script>

<VirtualTreeSelect
  bind:value={selected}
  options={treeData}
  multiple={true}
  searchable={true}
  placeholder="Select department..."
/>
```

### `<CronExpressionBuilder>`

Enterprise-grade cron scheduling rule visual builder with human-readable summary:
- Standard 5-part cron syntax support (minute, hour, day-of-month, month, day-of-week).
- Quick common presets (every minute, hourly, daily, workdays, monthly).
- Multi-tab segment configuration with cycle, interval, and specific value pickers.
- Simulated next 5 execution timestamps preview and one-click copy.

```svelte
<script lang="ts">
  import { CronExpressionBuilder } from '@svadmin/ui';

  let cronValue = $state('0 9 * * 1-5');
</script>

<CronExpressionBuilder
  bind:value={cronValue}
  showPreview={true}
  onchange={(val) => console.log('Updated cron:', val)}
/>
```

### `<OrgChart>`

Enterprise organizational structure and reporting hierarchy diagram:
- Clean CSS-powered connector lines between hierarchical managerial nodes.
- Collapsible child branches with report count badge indicators (`+N`).
- Customizable employee card slots with avatar, name, title, and department badges.
- Interactive node click events (`onnodeclick`) for drilldowns or profile inspections.

```svelte
<script lang="ts">
  import { OrgChart } from '@svadmin/ui';

  const orgData = {
    id: 'ceo',
    name: 'Sarah Connor',
    title: 'Chief Executive Officer',
    department: 'Executive Board',
    children: [
      {
        id: 'cto',
        name: 'John Doe',
        title: 'Chief Technology Officer',
        department: 'Engineering',
        children: [
          { id: 'lead', name: 'Alice Smith', title: 'Principal Architect', department: 'R&D' },
        ],
      },
    ],
  };
</script>

<OrgChart
  data={orgData}
  onnodeclick={(node) => console.log('Clicked node:', node.name)}
/>
```

### `<GaugeChart>` & `<MetricGrid>`

Enterprise dashboard speedometer gauge & responsive metrics grid container suite:
- **`<GaugeChart>` (SpeedometerGauge)**:
  - Vector SVG smooth rendering with 180° semi-circle, 240° speedometer arc, and 270° wide arc modes (`type="half" | "arc" | "circle"`).
  - Multi-tier threshold colored zones (e.g. 0-60 normal green, 60-85 warning amber, 85-100 critical red) mapped to semantic design tokens (`var(--success)`, `var(--warning)`, `var(--destructive)`).
  - Dual presentation modes: smooth rounded progress arc, mechanical indicator needle with pivot cap, or combined (`mode="progress" | "needle" | "both"`).
  - Custom tick marks and benchmark target line (`target={80}`, `targetLabel="SLA Target"`).
  - Full accessibility compliance (`role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
- **`<MetricGrid>` (DashboardMetricGrid)**:
  - Responsive breakpoint layout supporting 1 to 6 columns and adaptive auto-fit (`cols="auto"`).
  - Built-in skeleton loading grid (`loading={true}`, `skeletonCount={4}`).
  - Built-in empty placeholder support (`empty={true}`, `emptyMessage="No metrics found"`).
  - Seamlessly hosts `<GaugeChart>`, `<StatisticCard>`, `<MetricStrip>`, and custom metric widgets.

```svelte
<script lang="ts">
  import { GaugeChart, MetricGrid, StatisticCard } from '@svadmin/ui';

  let cpuLoad = 78.5;
  let slaScore = 99.4;
</script>

<MetricGrid title="Infrastructure Overview" description="Live telemetry metrics for prod-cluster" cols={3}>
  <GaugeChart
    value={cpuLoad}
    label="CPU Load"
    unit="%"
    type="arc"
    mode="both"
    target={80}
    targetLabel="SLA Threshold"
    subtext="Peak: 92.4% during peak hours"
  />

  <GaugeChart
    value={slaScore}
    min={95}
    max={100}
    label="SLA Compliance"
    unit="%"
    type="half"
    mode="progress"
    thresholds={[
      { value: 98, tone: 'destructive', label: 'Breach' },
      { value: 99, tone: 'warning', label: 'Risk' },
      { value: 100, tone: 'success', label: 'Compliant' }
    ]}
  />

  <StatisticCard
    title="Daily Active Operations"
    value="1,428,950"
    trend={{ value: 12.8, label: 'vs yesterday' }}
  />
</MetricGrid>
```

---

## MicroAppFrame / EmbeddedSandbox

Enterprise micro-frontend and isolated sub-application frame container:
- Secure bi-directional `postMessage` handshake protocol with origin whitelisting (`allowedOrigins`).
- Automatic state propagation: syncs host theme (`light`/`dark`), locale, and auth token to embedded iframe.
- Dynamic auto-resizing via child `svadmin:resize` events to eliminate inner scrollbars.
- Fullscreen immersion toggle, header toolbar with direct reload, external tab link, and timeout fallback cards.

```svelte
<script lang="ts">
  import { MicroAppFrame } from '@svadmin/ui';
</script>

<MicroAppFrame
  src="https://grafana.internal.net/d/telemetry-overview"
  title="Realtime Cluster Metrics"
  allowedOrigins={['https://grafana.internal.net']}
  theme="dark"
  autoResize
  onready={() => console.log('Micro application handshake complete')}
  onmessage={(msg) => console.log('Received message from sub-app:', msg)}
/>
```

## TaskCenter / BackgroundTaskDrawer

Enterprise asynchronous background task tracking and long-running job management center:
- Floating / header entry with animated progress ring and running task counter.
- Slide-over drawer with status categorization tabs: All, Running, Pending, Completed, Failed.
- Real-time progress bars with processed count indicators and remaining duration estimates.
- Actions for downloading export artifacts, cancelling active tasks, retrying failures, and clearing completed jobs.

```svelte
<script lang="ts">
  import { TaskCenter, type BackgroundTask } from '@svadmin/ui';

  let tasks: BackgroundTask[] = [
    {
      id: 'task-1',
      name: 'Sales Ledger Export (2026-Q1)',
      status: 'running',
      progress: 68,
      processedCount: 6800,
      totalCount: 10000,
      estimatedSecondsRemaining: 24,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      name: 'Customer Master Data Sync',
      status: 'completed',
      downloadUrl: 'https://cdn.example.com/exports/customers.xlsx',
      downloadFileName: 'customers.xlsx',
      createdAt: new Date().toISOString(),
    },
  ];
</script>

<TaskCenter
  showTrigger
  tasks={tasks}
  ondownload={(task) => console.log('Downloading:', task.downloadUrl)}
  oncancel={(task) => console.log('Cancel task:', task.id)}
  onretry={(task) => console.log('Retry task:', task.id)}
/>
```

---

## OfflineBanner & OfflineGuard

Mobile and weak-network resilience protection suite:
- `useNetworkStatus()` reactive hook for monitoring `isOnline`, `isWeak`, latency `rtt`, and downlink speeds.
- `<OfflineBanner>`: Global slide-down alert indicating lost connectivity with automatic draft backup and reconnection banner.
- `<OfflineGuard>`: Guard component that prevents data loss by intercepting form submissions or displaying modal overlays when disconnected.

```svelte
<script lang="ts">
  import { OfflineBanner, OfflineGuard, useNetworkStatus } from '@svadmin/ui';

  const network = useNetworkStatus();
</script>

<!-- Global top alert -->
<OfflineBanner
  onretry={() => console.log('Checking network connection...')}
/>

<!-- Action protection wrapper -->
<OfflineGuard mode="overlay">
  <form onsubmit={(e) => { e.preventDefault(); /* submit */ }}>
    <input placeholder="Enter title" />
    <button type="submit">Submit Form</button>
  </form>
</OfflineGuard>
```

---

## Enterprise Barcode, Metric Number Roll & Virtual List Suite

High-performance components designed for enterprise asset tracking, operational metrics dashboards, and massive dataset rendering:

- **`<Barcode>`**: Pure SVG vector barcode generator supporting standard CODE128, CODE39, and EAN-13 encodings. Zero heavy external canvas libraries, fully reactive, with native copy and printing integrations.
- **`<NumberRoll>`**: Smooth ease-out animated number counter designed for financial reports, executive dashboards, and real-time operational indicators. Supports dynamic thousands separators, floating point precision, currency prefixes, and trend color/icon adaptations.
- **`<VirtualList>`**: Generic, high-efficiency virtual scrolling container for tens of thousands of items (e.g. audit log streams, notification feeds, or complex message records). Renders only items currently within the viewport plus an overscan buffer, maintaining a 60fps frame rate with scroll-to-index and infinite bottom loading hooks.

### Barcode Example

```svelte
<script lang="ts">
  import { Barcode } from '@svadmin/ui';
</script>

<!-- Logistics tracking barcode with action toolbar -->
<Barcode
  value="SVADMIN-LOGISTICS-2026"
  format="CODE128"
  height={70}
  width={2}
  showActions
/>
```

### NumberRoll Animated Counter Example

```svelte
<script lang="ts">
  import { NumberRoll } from '@svadmin/ui';
</script>

<div class="flex items-center gap-6">
  <!-- Revenue metric with thousands separator and currency prefix -->
  <NumberRoll
    value={128450.5}
    from={0}
    duration={1500}
    decimals={2}
    prefix="¥"
    separator=","
  />

  <!-- Growth percentage with trend color and icon -->
  <NumberRoll
    value={24.8}
    decimals={1}
    suffix="%"
    trendColor
    showTrendIcon
  />
</div>
```

### VirtualList Massive Data Rendering Example

```svelte
<script lang="ts">
  import { VirtualList } from '@svadmin/ui';

  interface LogEntry {
    id: string;
    level: string;
    message: string;
    timestamp: string;
  }

  // 10,000 log records rendered seamlessly
  const logs: LogEntry[] = Array.from({ length: 10000 }, (_, i) => ({
    id: `log-${i}`,
    level: i % 10 === 0 ? 'ERROR' : 'INFO',
    message: `System transaction audit event #${i + 1}`,
    timestamp: new Date().toISOString(),
  }));
</script>

<VirtualList
  items={logs}
  itemHeight={52}
  height={400}
  overscan={5}
  keyField="id"
  onendreached={() => console.log('Reached the end of log stream')}
>
  {#snippet children(log, index)}
    <div class="flex items-center justify-between px-4 py-2 w-full border-b border-border/40 text-xs">
      <span class="font-mono text-muted-foreground">#{index + 1}</span>
      <span class="font-medium {log.level === 'ERROR' ? 'text-destructive' : 'text-foreground'}">
        [{log.level}] {log.message}
      </span>
      <span class="font-mono text-muted-foreground">{log.timestamp}</span>
    </div>
  {/snippet}
</VirtualList>
```

### `<UnsavedChangesGuard>` / `useUnsavedChanges`

Enterprise unsaved form modifications and page navigation protection suite:
- **`useUnsavedChanges`**:
  - Automatically listens to form dirty state (`isDirty`).
  - Intercepts native browser tab closing and page refreshes (`beforeunload`).
  - Intercepts internal router navigation, link clicks, and browser back/forward history navigation (`popstate`).
  - Provides programmatic `proceed()` and `cancel()` actions with `onLeave` / `onStay` hooks.
- **`<UnsavedChangesGuard>` (UnsavedChangesModal)**:
  - Declarative wrapper for forms, modal drawers, and editor pages.
  - Built-in accessible confirmation alertdialog (`role="alertdialog"`) with customizable warning copy, stay, and discard buttons.
  - 100% theme token compliant, ensuring dirty form data is never accidentally lost.

```svelte
<script lang="ts">
  import { UnsavedChangesGuard } from '@svadmin/ui';

  let isFormDirty = $state(false);
</script>

<UnsavedChangesGuard
  isDirty={isFormDirty}
  title="Unsaved Changes"
  message="You have unsaved edits in this record. Leaving now will discard all changes."
  stayText="Keep Editing"
  leaveText="Discard & Leave"
  onleave={() => console.log('User discarded modifications')}
  onstay={() => console.log('User remained on page')}
>
  <form oninput={() => (isFormDirty = true)}>
    <!-- Form fields -->
  </form>
</UnsavedChangesGuard>
```

## Enterprise Analytics & Business Insight Suite

### `<KpiCard>`

Multi-dimensional KPI scorecard designed for executive, financial, and operational dashboards:
- Main metric value formatting with thousands separators, currency prefixes, and custom suffixes.
- Integrated `<TrendIndicator>` capsule for period-over-period comparisons with semantic color adaptation.
- Pure SVG smooth Sparkline mini trend line and Target Progress Bar.
- Skeleton loading placeholder (`loading`) and SLA threshold alert banners (`alertStatus` / `alertMessage`).

```svelte
<script lang="ts">
  import { KpiCard } from '@svadmin/ui';

  const revenueSparkline = [12, 18, 15, 24, 38, 35, 52];
</script>

<KpiCard
  title="Quarterly Revenue"
  value={1284500}
  prefix="$"
  prevValue={1050000}
  trendPrefix="YoY"
  sparklineData={revenueSparkline}
  sparklineTone="success"
  targetProgress={{ current: 1284500, target: 1500000, label: 'Q3 Target' }}
  badge="Primary KPI"
/>
```

### `<JsonViewer>`

High-fidelity tree JSON inspector designed for API debugging, webhook payloads, audit diffs, and configuration centers:
- Strict semantic syntax color highlighting (keys, strings, numbers, booleans, and null).
- Depth-based collapsible/expandable nodes via `initialDepth` with interactive controls.
- Real-time keyword search filtering for keys and values.
- One-click full JSON copying and hover-to-copy property path helper.

```svelte
<script lang="ts">
  import { JsonViewer } from '@svadmin/ui';

  const webhookPayload = {
    event: 'order.created',
    timestamp: '2026-11-11T14:00:00Z',
    data: { orderId: 'ORD-98213', amount: 450.8, isPaid: true },
  };
</script>

<JsonViewer data={webhookPayload} initialDepth={2} searchable={true} copyable={true} />
```

### `<ResultPage>`

Standardized business process result and HTTP/operation exception display page:
- Standardized coverage for `success`, `processing`, `warning`, `error`, `403`, `404`, and `500` states.
- High-visibility semantic vector iconography with subtle glowing radial halos.
- Configurable primary and secondary action buttons or custom actions snippet.
- Dual layout support for `card` (container embedded) and `page` (full-page centered), with related business details slot.

```svelte
<script lang="ts">
  import { ResultPage } from '@svadmin/ui';
</script>

<ResultPage
  status="success"
  title="Project Initialized"
  description="Your multi-tenant workspace project has been provisioned successfully."
  primaryActionText="Go to Dashboard"
  onPrimaryAction={() => console.log('Go to Dashboard')}
  secondaryActionText="Create Another"
  onSecondaryAction={() => console.log('Create Another')}
/>
```

### `<WatermarkContainer>`

Anti-tamper enterprise dynamic watermark protection suite:
- Designed for confidential financial reports, HR compensation records, and sensitive dashboards.
- Supports multi-line employee IDs, tenant identifiers, client IP, and dynamic timestamps.
- **Anti-tamper guard**: Embedded `MutationObserver` detects DOM tree removals and inline styling overrides (`display: none`, `opacity: 0`, `visibility: hidden`), restoring watermark integrity within milliseconds to safeguard against screenshot leakage.

```svelte
<script lang="ts">
  import { WatermarkContainer } from '@svadmin/ui';
</script>

<WatermarkContainer
  content={['SVAdmin Enterprise', 'CONFIDENTIAL - 2026-11-11', 'UID: 9527']}
  gapX={48}
  gapY={48}
  antiTamper={true}
>
  <div class="p-8 bg-card border rounded-lg shadow-sm">
    <h3 class="text-lg font-semibold">Q4 Confidential Financial Statement</h3>
    <p class="text-sm text-muted-foreground mt-2">Executive summary data...</p>
  </div>
</WatermarkContainer>
```

### `<ContextMenu>`

Enterprise contextual right-click operation menu suite:
- Seamlessly mounts on table rows, organization tree nodes, metric cards, and file explorers.
- Built-in intelligent viewport collision algorithm that automatically mirrors and clamps coordinates at window boundaries.
- Full support for keyboard shortcut hints, multi-level submenus, visual dividers, disabled states, and danger highlights.

```svelte
<script lang="ts">
  import { ContextMenu, type ContextMenuItem } from '@svadmin/ui';

  const menuItems: ContextMenuItem[] = [
    { key: 'copy', label: 'Copy ID', shortcut: '⌘C' },
    { key: 'export', label: 'Export Details' },
    { key: 'sep1', label: '', divider: true },
    { key: 'delete', label: 'Delete Record', danger: true, shortcut: 'Del' },
  ];
</script>

<ContextMenu items={menuItems} onselect={(item) => console.log('Selected:', item.key)}>
  <div class="p-6 border rounded-md bg-muted/20 text-center select-none cursor-context-menu">
    Right-click inside this area to inspect context actions
  </div>
</ContextMenu>
```

### `<OtpInput>`

Enterprise two-factor authentication (2FA) and sensitive operation verification grid:
- Tailored for high-security login verification, financial transaction approval, and dangerous deletion confirmation.
- Smooth sequential auto-focus to next slot, Backspace auto-rewind, and full keyboard arrow navigation.
- Smart clipboard paste parsing with automated character validation and slot distribution.
- Optional password masking (`●`), error shake states, and responsive size presets (`sm`, `md`, `lg`).

```svelte
<script lang="ts">
  import { OtpInput } from '@svadmin/ui';

  let code = $state('');
</script>

<OtpInput
  length={6}
  bind:value={code}
  type="number"
  autoFocus={true}
  oncomplete={(val) => console.log('2FA Code Complete:', val)}
/>
```

### `<AnnouncementBanner>`

Global enterprise broadcast banner and scheduled maintenance countdown bar:
- Designed for planned maintenance downtime countdowns, multi-tenant quota alerts, release announcements, and security notices.
- Supports `info`, `warning`, `error`, and `success` semantic tones using strict design tokens.
- **Maintenance Countdown**: Pass `countdownTo` to automatically compute and render a real-time countdown clock, invoking `oncountdownend` upon completion.
- **Carousel & Persistence**: Supports rotating multiple announcement items (`items` + `interval`) and remembering dismissal per `storageKey` in `localStorage`.

```svelte
<script lang="ts">
  import { AnnouncementBanner } from '@svadmin/ui';

  const scheduledTime = new Date(Date.now() + 3600 * 1000 * 4);
</script>

<AnnouncementBanner
  tone="warning"
  message="Routine database archive & capacity upgrade scheduled for tonight at 22:00 UTC. Write operations will pause briefly."
  countdownTo={scheduledTime}
  countdownPrefix="Maintenance starts in: "
  actionText="View Maintenance Plan"
  actionHref="/maintenance/plan"
  closable={true}
  storageKey="announcement-maintenance-202611"
/>
```

### `<TextDiffViewer>`

Enterprise text and configuration split/unified diff viewer:
- Built for config center publishing audits, SQL/script review, and approval workflow change tracking.
- Pure client-side LCS diff engine with zero heavy dependencies, millisecond alignment, and semantic additions/deletions styling.
- **Split & Unified Modes**: Toggle effortlessly between side-by-side (`split`) and inline (`unified`) views.
- **Context Folding & Metrics**: Collapse unchanged lines (`collapseUnchanged`) to focus purely on changes, inspect line counters (`+added`, `-deleted`), and copy baseline or updated snapshots in one click.

```svelte
<script lang="ts">
  import { TextDiffViewer } from '@svadmin/ui';

  const baseline = `server_port: 8080\nmax_connections: 500\nlog_level: info\ncache_enabled: false`;
  const current = `server_port: 8080\nmax_connections: 2000\nlog_level: debug\ncache_enabled: true\ncluster_mode: active`;
</script>

<TextDiffViewer
  oldText={baseline}
  newText={current}
  oldTitle="Production Config (v1.2)"
  newTitle="Pending Release (v1.3)"
  viewMode="split"
  collapseUnchanged={false}
/>
```

### `<AsyncExportModal>`

Enterprise massive dataset asynchronous export center modal:
- Tailored for large-scale financial reports, order ledgers, and audit logs without freezing the browser tab or hitting HTTP timeouts.
- **Full Lifecycle Management**: Interactive parameter configuration (file name, format, scope, column selection) -> asynchronous progress polling -> download & URL copy -> error retry handling.
- Supports `.xlsx`, `.csv`, and `.json` exports with configurable column pickers and scoped selection counters.

```svelte
<script lang="ts">
  import { AsyncExportModal } from '@svadmin/ui';

  let isExportOpen = $state(false);

  const columns = [
    { key: 'orderNo', label: 'Order ID', defaultSelected: true },
    { key: 'customer', label: 'Customer', defaultSelected: true },
    { key: 'amount', label: 'Amount', defaultSelected: true },
    { key: 'createdAt', label: 'Created At', defaultSelected: true },
    { key: 'remark', label: 'Approval Note', defaultSelected: false },
  ];
</script>

<button onclick={() => (isExportOpen = true)}>Open Export Center</button>

<AsyncExportModal
  bind:open={isExportOpen}
  resourceName="Financial Orders"
  defaultFileName="2026Q4-Settlement-Report"
  totalCount={154200}
  filteredCount={3200}
  selectedCount={4}
  {columns}
  onclose={() => (isExportOpen = false)}
/>
```

### `<StepWizard>`

Enterprise step wizard navigation and form progression suite:
- Supports horizontal and vertical step layouts with `wait`, `process`, `finish`, and `error` status indicators.
- **Async Validation Guard**: Intercepts step transitions with `beforeNext?: (stepIndex, step, draft) => Promise<boolean>`, preventing advancement and surfacing validation errors when invalid.
- **Dynamic Branching**: Supports conditional steps via `condition?: (draft) => boolean` to dynamically branch workflows based on earlier user input.
- **Draft Auto-Staging**: Automatic local breakpoint saving and restoration via `storageKey`, with quick reset and manual patch controls.

```svelte
<script lang="ts">
  import { StepWizard, type StepWizardItem } from '@svadmin/ui';

  const steps: StepWizardItem[] = [
    { id: 'tenant', title: 'Tenant Info', description: 'Basic workspace identity' },
    { id: 'cloud', title: 'Cloud Resources', description: 'Configure VPC & cluster' },
    { id: 'confirm', title: 'Review & Launch', description: 'Confirm deployment' },
  ];

  let currentStep = $state(0);
  let draft = $state({ name: '', region: 'us-east-1' });

  async function validateStep(index: number) {
    if (index === 0 && !draft.name) return false;
    return true;
  }
</script>

<StepWizard
  {steps}
  bind:currentStep
  bind:draft
  storageKey="tenant-onboarding-wizard"
  beforeNext={validateStep}
  onFinish={(data) => console.log('Finished:', data)}
/>
```

### `<WorkflowStepper>`

Visual execution flow tracker for background pipelines, cloud provisioning, and multi-stage jobs:
- Covers `wait`, `running`, `completed`, `failed`, `blocked`, and `skipped` states with animated progress indicators.
- Real-time execution duration formatting (e.g. `450ms`, `12.4s`) and step timestamp tracking.
- Interactive failure recovery with individual node retry triggers (`onRetry`) and custom detail slots (`stepDetail`).

```svelte
<script lang="ts">
  import { WorkflowStepper, type WorkflowStepItem } from '@svadmin/ui';

  const pipeline: WorkflowStepItem[] = [
    { id: 'vpc', label: 'Provision VPC', status: 'completed', durationMs: 820 },
    { id: 'k8s', label: 'Bootstrap Cluster', status: 'running' },
    { id: 'dns', label: 'Propagate Anycast DNS', status: 'wait' },
  ];
</script>

<WorkflowStepper
  steps={pipeline}
  title="Infrastructure Deployment"
  onRetry={(step) => console.log('Retrying step:', step.id)}
/>
```

### `<ColumnVisibilityDrawer>`

Advanced column visibility manager and multi-dimensional view persistence drawer for wide data tables (30–50 columns):
- Checkbox visibility toggles, business required column locks (`col.required`), and left/right sticky column pinning (`fixed: 'left' | 'right'`).
- Native smooth drag-and-drop reordering with zero heavy external dependencies.
- Multi-view persistence (`storageKey`) with custom user view saving and pre-configured view presets (e.g. "Compact View", "Finance Audit View").

```svelte
<script lang="ts">
  import { ColumnVisibilityDrawer, type ColumnItem } from '@svadmin/ui';

  let open = $state(false);
  let columns = $state<ColumnItem[]>([
    { key: 'id', label: 'ID', visible: true, required: true },
    { key: 'name', label: 'Customer Name', visible: true, fixed: 'left' },
    { key: 'revenue', label: 'Annual Revenue', visible: true },
    { key: 'taxNo', label: 'Tax Identification', visible: false },
  ]);

  const presets = [
    { id: 'compact', label: 'Compact View', visibleKeys: ['id', 'name', 'revenue'] },
  ];
</script>

<button onclick={() => (open = true)}>Configure Columns</button>

<ColumnVisibilityDrawer
  bind:open
  bind:columns
  {presets}
  storageKey="customer-table-columns"
/>
```

### `<ColumnFilterBuilder>`

Multi-condition nested `AND` / `OR` query tree builder drawer:
- Build complex filter hierarchies with rich comparison operators (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`, `between`, `null`).
- Displays active filter count badge on trigger and compiles directly to `@svadmin/core` filter specifications.

```svelte
<script lang="ts">
  import { ColumnFilterBuilder } from '@svadmin/ui';
  import type { FieldDefinition, Filter } from '@svadmin/core';

  const fields: FieldDefinition[] = [
    { key: 'status', label: 'Status', type: 'select' },
    { key: 'amount', label: 'Amount', type: 'number' },
  ];

  let filters = $state<Filter[]>([]);
</script>

<ColumnFilterBuilder
  showTrigger={true}
  {fields}
  bind:filters
  onApply={(compiled) => console.log('Applied filters:', compiled)}
/>
```

### `useHotkeys` & `<KeyboardShortcutsModal>`

Enterprise keyboard productivity suite:
- **`useHotkeys`**: Reactive Svelte 5 hook supporting modifier combos (`Mod+S`, `Shift+?`, `Alt+T`) and single keys (`J/K`, `Escape`). Smart input avoidance pauses bare single keys when typing in input or textarea elements while allowing modifier combos.
- **`<KeyboardShortcutsModal>`**: macOS and Linear inspired shortcuts matrix dialog with categorized grouping, live search filtering, and automatic registration from active `useHotkeys` instances.

```svelte
<script lang="ts">
  import { useHotkeys, KeyboardShortcutsModal } from '@svadmin/ui';

  let isShortcutsModalOpen = $state(false);

  // Register command hotkeys
  useHotkeys('Mod+S', () => console.log('Saving form...'), {
    label: 'Save Current Form',
    description: 'Trigger form submission',
    category: 'action',
  });

  useHotkeys(['?', 'Shift+?'], () => {
    isShortcutsModalOpen = !isShortcutsModalOpen;
  });
</script>

<KeyboardShortcutsModal bind:open={isShortcutsModalOpen} />
```

### `<SensitiveDataMask>` / `<MaskedText>`

Sensitive data dynamic masking and authorization reveal component for compliance and data privacy:
- Built-in presets for `phone` / `mobile`, `id-card` / `idCard`, `bank-card` / `bankCard`, `email`, and Chinese/Western `name`.
- Clickable reveal toggle with `onReveal` async permission verification and audit logging callback.
- Safe clipboard protection (`copyMode="masked" | "raw" | "auto"`) preventing accidental data leakage.

```svelte
<script lang="ts">
  import { SensitiveDataMask, MaskedText } from '@svadmin/ui';

  async function checkPermissionAndAudit() {
    // E.g. verify permission or log audit trail
    console.log('Unmask requested by user');
    return true; // return false to reject unmasking
  }
</script>

<!-- Mobile phone mask -->
<SensitiveDataMask
  value="13812345678"
  type="mobile"
  onReveal={checkPermissionAndAudit}
  copyMode="masked"
/>

<!-- Name mask alias -->
<MaskedText
  value="诸葛孔明"
  type="name"
/>
```

### `<SessionTimeoutGuard>` & `useSessionTimeout`

Enterprise session inactivity timeout guard and compliance auto-lock suite:
- Conforms to 等保 2.0, HIPAA, and PCI-DSS requirements by actively tracking user interactions (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`).
- **Cross-Tab Synchronization**: Uses `BroadcastChannel` and `localStorage` storage events to maintain synchronized idle timestamps across all open browser windows (activity in any tab extends the session across all tabs).
- **Proactive Countdown Warning**: Surfaces an alert modal with real-time countdown seconds when entering the warning window, with one-click session renewal or immediate locking.

```svelte
<script lang="ts">
  import { SessionTimeoutGuard } from '@svadmin/ui';
</script>

<SessionTimeoutGuard
  timeoutMinutes={15}
  warningSeconds={60}
  onTimeout={() => console.log('Session locked due to inactivity')}
  onExtend={() => console.log('Session token refreshed')}
>
  <div class="p-6">
    <h3>Confidential Operations Workspace</h3>
  </div>
</SessionTimeoutGuard>
```

### `<DualApprovalGate>` / `<TwoPersonRuleModal>`

Presentation layer for two-person review (Maker-Checker) of dangerous and irreversible operations:
- Presents onsite and remote review states.
- Sends review intent to the host through `onReviewRequest` or `onRemoteReviewRequest`.
- The host must update `approvalState` from the real approval RPC/state machine. The component does not create approval records, audit hashes, or simulated approvals.

```svelte
<script lang="ts">
  import { DualApprovalGate, type DualApprovalRequest, type DualApprovalState } from '@svadmin/ui';

  let open = $state(false);
  let approvalState = $state<DualApprovalState>('idle');

  async function submitReview(request: DualApprovalRequest) {
    approvalState = 'submitting';
    // Call the business approval RPC and write its real result back to approvalState.
    console.log(request);
  }
</script>

<DualApprovalGate
  bind:open
  actionId="approval-request-42"
  actionTitle="Production API Gateway Key Rotation"
  requiredRole="Chief Security Officer"
  {approvalState}
  onReviewRequest={submitReview}
>
  <button class="bg-destructive text-destructive-foreground px-4 py-2 rounded">
    Rotate Secret Key
  </button>
</DualApprovalGate>
```

### `<TableClipboardManager>` & `useTableClipboard`

Enterprise bidirectional clipboard interaction suite for tabular data and Excel / Google Sheets:
- **`useTableClipboard`**: Parses tab-delimited (TSV) and comma-delimited (CSV) text copied from Excel with RFC 4180 quote support.
- **Smart Column Mapping**: Automatically aligns clipboard header text with table column definitions.
- **`<TableClipboardManager>`**: Floating toolbar providing one-click "Copy Selected as TSV" and keyboard `⌘V` paste capture with data preview modal, validation checks, append/overwrite mode toggles, and Undo rollback.

```svelte
<script lang="ts">
  import { TableClipboardManager } from '@svadmin/ui';

  const columns = [
    { key: 'sku', label: 'SKU Code' },
    { key: 'name', label: 'Product Name' },
    { key: 'price', label: 'Unit Price' },
  ];

  let selectedRows = $state([{ sku: 'A1', name: 'Widget', price: 99 }]);
</script>

<TableClipboardManager
  {columns}
  {selectedRows}
  onPasteConfirmed={(rows, mode) => console.log('Pasted rows:', rows, mode)}
  onUndo={() => console.log('Reverted paste')}
/>
```

### `useAudioAlert` & `<AudioFeedbackProvider>`

Pure native Web Audio API acoustic feedback and operational sound effects suite:
- **Zero External Assets (0KB network size)**: Uses browser-native `OscillatorNode` synthesis for instant, zero-latency feedback without downloading mp3 or wav files.
- **Industrial Sound Presets**:
  - `success`: Crisp ascending major chord (C5 -> E5 -> G5) for barcode scan and mutation success.
  - `error`: Low punchy buzz (180Hz -> 130Hz) for validation failure or rejected action.
  - `warning`: Double-pulse warning tone (440Hz -> 880Hz) for threshold alerts.
  - `beep`: Authentic 1000Hz laser scanner beep for warehouse and POS barcode terminals.
  - `notify`: Gentle marimba notification chime.
- **User-Centric Controls**: Global mute toggle, volume adjustment, and test sound previews.

```svelte
<script lang="ts">
  import { useAudioAlert, AudioFeedbackProvider } from '@svadmin/ui';

  const audio = useAudioAlert({ volume: 0.8 });

  function handleScanSuccess() {
    audio.play('beep');
  }
</script>

<AudioFeedbackProvider showControls={true}>
  <button onclick={handleScanSuccess}>Scan Barcode</button>
</AudioFeedbackProvider>
```

### `<PrintableReportLayout>` & `usePrintExport`

Enterprise printable report layout and high-fidelity PDF export suite:
- Supports standard paper sizes (A4, A5, Letter) in portrait and landscape orientations.
- **Anti-Break Pagination**: Configured with `page-break-inside: avoid` to prevent mid-row table splits and broken signature blocks.
- **Repetitive Table Headers**: Enforces `thead { display: table-header-group; }` across multi-page printing.
- Built-in metadata strip, official approval seal/stamp area, and page numbering.

```svelte
<script lang="ts">
  import { PrintableReportLayout } from '@svadmin/ui';

  const metadata = [
    { label: 'Document No.', value: 'PO-2026-9081' },
    { label: 'Fiscal Period', value: '2026-Q4' },
  ];

  const signatures = [
    { role: 'Preparer', name: 'Alice Smith' },
    { role: 'Supervisor Auditor', name: 'Bob Jones' },
  ];
</script>

<PrintableReportLayout
  title="Quarterly Settlement Statement"
  subtitle="Official commercial accounting ledger"
  reportNo="PO-2026-9081"
  {metadata}
  {signatures}
  watermarkText="CONFIDENTIAL"
>
  <div class="py-4">
    <p>Financial ledger statements and tabular line items...</p>
  </div>
</PrintableReportLayout>
```

### `<FunnelChart>` & `<SankeyChart>`

Enterprise business conversion funnel and path flow diagram suite:
- **Zero Heavy Dependencies**: Pure SVG vector rendering with no bulky external chart engines.
- **Conversion & Drop-off Rates**: Automatically calculates stage-by-stage retention percentages and drop-off rates (`-40%`).
- **Interactive Stages**: Clickable stage segments with hover highlights and end-to-end total conversion calculations.
- **`<SankeyChart>`**: Multi-stage source-to-target flow visualization for marketing attribution and resource allocation.

```svelte
<script lang="ts">
  import { FunnelChart, type FunnelStageItem } from '@svadmin/ui';

  const stages: FunnelStageItem[] = [
    { id: '1', label: 'Page Impressions', value: 120000 },
    { id: '2', label: 'Product Clicks', value: 45000 },
    { id: '3', label: 'Added to Cart', value: 18000 },
    { id: '4', label: 'Completed Checkout', value: 7200 },
  ];
</script>

<FunnelChart
  {stages}
  title="E-Commerce Checkout Funnel"
  showPercentages={true}
  showDropoff={true}
/>
```

### `<SchemaVisualModeler>`

Visual resource schema reverse engineering and code generation canvas:
- Interactive field designer (key, label, type, required, filterable, sortable).
- One-click reverse engineering from sample JSON objects.
- Instant Svelte 5 / `@svadmin/core` `ResourceDefinition` code generation with copy-to-clipboard support.

```svelte
<script lang="ts">
  import { SchemaVisualModeler } from '@svadmin/ui';
</script>

<SchemaVisualModeler
  resourceName="PurchaseOrder"
  onSaveSchema={(name, fields) => console.log('Schema configured:', name, fields)}
/>
```

### `<MicroAppBridge>` & `useMicroAppEvent`

Enterprise micro-frontend sandbox bridge and cross-origin event bus:
- Type-safe, Origin-whitelisted postMessage communication between host and child iframe micro-apps (`<MicroAppFrame>`).
- Seamless bidirectional event subscriptions, RPC requests (`PING`/`PONG`), and automated host theme / locale state synchronization.

```svelte
<script lang="ts">
  import { MicroAppBridge, useMicroAppEvent } from '@svadmin/ui';

  const bus = useMicroAppEvent({ channel: 'enterprise_portal' });

  bus.on('ORDER_CREATED', (payload) => {
    console.log('Sub-app created order:', payload);
  });
</script>

<MicroAppBridge appId="subapp-billing" />
```

### `<RuleExpressionBuilder>` / `<LogicalRuleTree>`

Enterprise business rule expression builder and logical rule tree suite:
- **Nested Boolean Logic**: Supports recursive condition groups (`AND` / `OR` / `NOT`) for risk management, automated approval routing, and alert thresholds.
- **Dynamic Variable Selection**: Pick left-hand field keys (`order.amount`, `user.level`), operators (`=`, `>`, `<`, `in`, `contains`, `regex`), and dynamic right-hand values.
- **Real-Time AST Compilation**: Compiles visual trees into both structured JSON AST and readable natural-language expressions with one-click copy.

```svelte
<script lang="ts">
  import { RuleExpressionBuilder } from '@svadmin/ui';

  const fields = [
    { key: 'order.amount', label: 'Order Amount', type: 'number' },
    { key: 'user.riskScore', label: 'Risk Score', type: 'number' },
    { key: 'user.level', label: 'Member Level', type: 'string' },
  ];
</script>

<RuleExpressionBuilder
  {fields}
  onChange={(ast, expr) => console.log('Rule updated:', expr, ast)}
/>
```

### `<ClusterTopologyGraph>` / `<ServiceHealthGrid>`

Distributed service cluster health and full-topology architecture graph:
- **0KB External Overhead**: Pure SVG vector rendering with no bulky charting or canvas dependencies.
- **Tiered Microservice Topology**: Visualizes Ingress Gateways, Application Services, and Database/Cache/Queue storage tiers.
- **Node Diagnostics & Action**: Interactive node selection with real-time QPS, latency ms, error rate %, and instance restart actions.

```svelte
<script lang="ts">
  import { ClusterTopologyGraph } from '@svadmin/ui';
</script>

<ClusterTopologyGraph
  title="Production Microservice Topology"
  onNodeSelect={(node) => console.log('Inspecting node:', node.id)}
  onRestartNode={(node) => console.log('Restarting service:', node.id)}
/>
```

### `<SnapshotTimelineReplay>` / `<TimeTravelDiff>`

Time-travel audit snapshot replay and side-by-side revision comparator:
- **Interactive Time-Travel Slider**: Smoothly scrub across revision histories to restore historical snapshot states at arbitrary timestamps.
- **Field-Level Diff Highlighting**: Side-by-side comparison (Before ↔ After) with highlighted modified, added, and deleted attributes.
- **Rollback Request Flow**: Supports one-click audit snapshot rollback workflow initiation.

```svelte
<script lang="ts">
  import { SnapshotTimelineReplay, type SnapshotRevision } from '@svadmin/ui';

  const revisions: SnapshotRevision[] = [
    {
      id: 'rev-1',
      version: 1,
      timestamp: '2026-11-01 10:00:00',
      author: 'Alice (Security)',
      auditHash: 'SHA-001',
      snapshot: { status: 'draft', quota: 100 },
    },
    {
      id: 'rev-2',
      version: 2,
      timestamp: '2026-11-02 14:30:00',
      author: 'Bob (Lead)',
      auditHash: 'SHA-002',
      snapshot: { status: 'published', quota: 500 },
    },
  ];
</script>

<SnapshotTimelineReplay
  {revisions}
  onApplyRollback={(rev) => console.log('Reverting to snapshot:', rev.version)}
/>
```

### `<ActionPalette>` / `<QuickActionDrawer>`

Keyboard-first quick action launcher and contextual command palette (Linear / Raycast style):
- **Lightning-Fast Execution**: Triggered via keyboard shortcut (`⌘.`) on highlighted or selected table records.
- **Fuzzy Search & Pinyin Matching**: Search commands instantly by name, shortcut key, or action category.
- **Inline Parameter Prompting**: Seamlessly prompts for parameters (e.g. transfer assignee, rejection reason) before batch execution.

```svelte
<script lang="ts">
  import { ActionPalette } from '@svadmin/ui';

  let open = $state(false);
  let selectedRecords = $state([{ id: 101 }, { id: 102 }]);
</script>

<ActionPalette
  bind:open
  {selectedRecords}
  onExecuteAction={(id, param) => console.log('Executed action:', id, param)}
/>
```

### `<I18nLanguagePackEditor>` & `useDynamicLocale`

Dynamic runtime localization patch loader and online translation editor:
- **Zero-Deploy Hotfixes**: Modify online translations without rebuilding, committing, or redeploying code.
- **Namespace Organization**: Browse translation keys by namespace (`common`, `table`, `form`, `auth`), filter search terms, and edit inline.
- **Dynamic Translation Runtime**: `useDynamicLocale` overrides static core strings dynamically via remote APIs or localStorage patches.

```svelte
<script lang="ts">
  import { I18nLanguagePackEditor, useDynamicLocale } from '@svadmin/ui';

  const i18n = useDynamicLocale();
</script>

<I18nLanguagePackEditor
  targetLocale="zh-CN"
  onSavePatch={(locale, patch) => console.log('Published i18n patch:', locale, patch)}
/>
```

### `<FormulaField>` & `useFormulaEngine`

Enterprise dynamic formula field and sandboxed expression calculation engine:
- **Zero eval() Vulnerabilities**: Pure AST-based arithmetic and logic evaluator supporting `+`, `-`, `*`, `/`, `^`, `%`, `(`, `)`.
- **Built-in Functions**: Supports `SUM`, `AVG`, `MAX`, `MIN`, `ROUND(val, decimals)`, and `IF(cond, thenVal, elseVal)`.
- **Formula Tooltip & Manual Override**: Displays interactive `f(x) = ...` formula preview badge with optional toggle to manually override values.

```svelte
<script lang="ts">
  import { FormulaField } from '@svadmin/ui';

  let form = $state({ price: 199, qty: 3, discount: 0.1 });
</script>

<FormulaField
  label="Net Total Price"
  formula="price * qty * (1 - discount)"
  scope={form}
  prefix="¥"
  precision={2}
  allowManualOverride={true}
/>
```

### `<DataScreenContainer>` / `<FullscreenDashboardLayout>`

Operations center and high-resolution data visualization big-screen container:
- **Scale-to-Fit Auto Scaling**: Automatically calculates uniform scaling (`scale(x)`) based on design dimensions (1920x1080, 21:9, etc.), pixel-perfect centering on any screen size.
- **Header & Clock**: Built-in digital clock, status headers, and full-screen switcher.
- **Cyberpunk Accents**: Optional neon tech luminous corner lines.

```svelte
<script lang="ts">
  import { DataScreenContainer } from '@svadmin/ui';
</script>

<DataScreenContainer
  title="Real-time Dispatch Operations Center"
  subtitle="NOC Telemetry & Sensor Monitoring"
  width={1920}
  height={1080}
>
  <div class="grid grid-cols-3 gap-6 h-full">
    <!-- Telemetry Cards & SVG charts -->
  </div>
</DataScreenContainer>
```

### `<ThreadedCommentDrawer>` / `<RecordAnnotationBox>`

Record-level collaborative discussion stream and threaded annotation drawer:
- **Threaded Replies & Reactions**: Support nested discussion trees, emoji reactions (`👍`, `✅`), and timestamps.
- **Task Resolution Status**: Toggle comments as "Resolved" to close out revision concerns.
- **Mentions & Markdown**: Integrated `@` member mention tags and formatted response submissions.

```svelte
<script lang="ts">
  import { ThreadedCommentDrawer, type ThreadedComment } from '@svadmin/ui';

  let open = $state(false);
  let comments = $state<ThreadedComment[]>([
    {
      id: '1',
      author: 'Alice (Compliance)',
      content: 'Please verify VAT invoice numbers against tax authority registry.',
      createdAt: '10m ago',
      isResolved: false,
    },
  ]);
</script>

<ThreadedCommentDrawer
  bind:open
  recordTitle="Purchase Order #PO-991"
  {comments}
  onAddComment={(text, parentId) => console.log('New reply:', text, parentId)}
/>
```

### `useStorageCache` & Storage Adapters

Enterprise cross-platform key-value cache and storage adapter suite:
- **Zero Backend Lock-In**: Complete decoupling from specific infrastructure. Seamlessly switch between in-memory testing (`MemoryStorageAdapter`), browser persistence (`LocalStorageAdapter`), large-scale offline client cache (`IndexedDB`), or generic remote REST KV services (`RemoteKVAdapter`).
- **TTL Eviction & Namespacing**: Automatic expiration of cached tokens and filter preferences with isolated namespace prefixes.
- **Svelte 5 Reactivity**: `useStorageCache` provides reactive values with automatic write-through and cross-tab sync.

```svelte
<script lang="ts">
  import { useStorageCache, LocalStorageAdapter } from '@svadmin/ui';

  const userPrefs = useStorageCache('user_dashboard_prefs', { density: 'comfortable' }, {
    adapter: new LocalStorageAdapter('svadmin_enterprise'),
    ttlSeconds: 86400, // 24-hour cache
  });
</script>

<div>Current Density: {userPrefs.value.density}</div>
<button onclick={() => userPrefs.set({ density: 'compact' })}>Switch to Compact</button>
```

### `<TreeTransferSelect>` / `<CascadingAssigner>`

Deep organization tree transfer and multi-tiered batch assigner:
- **Hierarchical Branch Selection**: Supports cascading indeterminate checkboxes, branch subtree select-all, and leaf-only node filtering.
- **Target Mode Flexibility**: View assigned items in a flat list or grouped by department, with single-click removal or bulk reset.
- **Live Search**: Integrated instant search filter with node path indicators.

```svelte
<script lang="ts">
  import { TreeTransferSelect, type TreeTransferSelectNode } from '@svadmin/ui';

  const orgTree: TreeTransferSelectNode[] = [
    {
      id: 'eng',
      label: 'Engineering',
      children: [
        { id: 'u1', label: 'Ada Lovelace (Frontend)', isLeaf: true },
        { id: 'u2', label: 'Alan Turing (Backend)', isLeaf: true },
      ],
    },
  ];

  let assignedKeys = $state(['u1']);
</script>

<TreeTransferSelect
  treeData={orgTree}
  bind:targetKeys={assignedKeys}
  sourceTitle="Corporate Directory"
  targetTitle="Assigned Operators"
/>
```

### `<VirtualCardGrid>` / `<MediaCardSelect>`

Virtualized responsive card gallery and media multi-selection suite:
- **60fps Viewport Virtualization**: Renders only currently visible card rows, effortlessly scaling to 10,000+ items without DOM bloat or frame drops.
- **Responsive Grid**: Adapts columns automatically (2/3/4/6 columns) based on container width.
- **Multi-Select Controls**: Integrated selection states with count badges, custom card snippets, and batch action toolbars.

```svelte
<script lang="ts">
  import { VirtualCardGrid } from '@svadmin/ui';

  const mediaItems = Array.from({ length: 500 }, (_, i) => ({
    id: `item-${i + 1}`,
    title: `Asset #${i + 1}`,
    subtitle: '1080p WebP',
  }));

  let selectedIds = $state<string[]>([]);
</script>

<VirtualCardGrid
  items={mediaItems}
  bind:selectedIds
  columns={4}
  cardHeight={180}
/>
```

### `<ApprovalChainBuilder>` / `<ApproverNodeConfig>`

Visual multi-tier approval chain flow builder and node policy designer:
- **Lightweight Vertical Node Flow**: Linear node sequence (Start -> Approvers -> CC) with one-click `+` insertion between any steps.
- **Approver Execution Policies**: Supports `all` (Countersign / All must approve), `one` (Any one approves), and `sequential` approval.
- **Side Node Inspector**: Real-time attribute configuration for role assignees, approval modes, and timeout escalation.

```svelte
<script lang="ts">
  import { ApprovalChainBuilder, type ApprovalChainNode } from '@svadmin/ui';

  let chain = $state<ApprovalChainNode[]>([
    { id: 'start', type: 'start', title: 'Initiator', roleName: 'All Employees' },
    { id: 'mgr', type: 'approver', title: 'Department Lead', roleName: 'Supervisor', mode: 'one' },
    { id: 'fin', type: 'approver', title: 'Finance Audit', roleName: 'Controller', mode: 'all' },
  ]);
</script>

<ApprovalChainBuilder
  bind:nodes={chain}
  onChange={(nodes) => console.log('Updated approval chain:', nodes)}
/>
```

### `<PeriodComparisonCard>` / `<MetricsDeltaPill>`

Executive management dashboard cross-period comparison card:
- **Multi-Period Baseline Comparison**: Formats current period vs baseline/prior period metrics side-by-side.
- **Delta Indicator Pills**: Calculates absolute change (`+¥250,000`) and percentage delta (`+25%`), shifting between green (positive) and red (negative), with `reverseColor` support for error counts and latencies.
- **SVG Micro Comparison Bars**: Pure SVG dual progress comparison lines with zero chart engine dependencies.

```svelte
<script lang="ts">
  import { PeriodComparisonCard } from '@svadmin/ui';
</script>

<PeriodComparisonCard
  title="Quarterly Gross Revenue"
  currentValue={1250000}
  previousValue={1000000}
  prefix="¥"
  periodName="vs Last Quarter"
### `<RecordCompareModal>` / `<EntityComparisonDrawer>`

Enterprise multi-record parameter comparison and difference spotlight suite:
- **Side-by-side Matrix**: Compares 2 to 5 records across all attributes with fixed sticky row labels.
- **Difference Spotlight**: Toggle "Only Differences" (`defaultHideIdentical` supported) with primary accent highlight to focus on diverging configurations.
- **Baseline Selection**: Dynamically switch the benchmark reference record column.
- **Attribute Value Sync**: Built-in one-click sync action to copy values from baseline to target records (`onsync`).
- **Flexible Layouts**: Supports centered overlay dialog (`layout="modal"`) and right-side slide-over (`layout="drawer"`).

```svelte
<script lang="ts">
  import { RecordCompareModal } from '@svadmin/ui';

  let showCompare = $state(true);
  const serverNodes = [
    { id: 'node-01', name: 'Master-A', cpu: '16 Cores', memory: '64 GB', region: 'us-east' },
    { id: 'node-02', name: 'Replica-B', cpu: '32 Cores', memory: '64 GB', region: 'us-east' },
    { id: 'node-03', name: 'Canary-C', cpu: '8 Cores', memory: '32 GB', region: 'us-west' },
  ];
</script>

<RecordCompareModal
  bind:open={showCompare}
  title="Server Specification Comparison"
  records={serverNodes}
  benchmarkIndex={0}
  onsync={(source, target, field) => console.log(`Synced ${field} to ${target.name}`)}
/>
```

### `<PlanUsageQuotaBar>`

Enterprise SaaS multi-tenant quota usage and limit progress suite:
- Designed for tenant settings, subscription overviews, and quota breach warnings.
- **Multi-Quota Aggregation**: Tracks API calls, storage, seats, and compute hours with threshold-driven status color shifts (normal, warning amber, danger red).
- **Reset Cycles & Upgrade CTAs**: Communicates reset dates with one-click upgrade / expand capacity triggers.

```svelte
<script lang="ts">
  import { PlanUsageQuotaBar, type QuotaItem } from '@svadmin/ui';

  const quotas: QuotaItem[] = [
    { id: 'api', label: 'API Request Quota', current: 78500, limit: 100000, unit: 'req' },
  ];
</script>

<PlanUsageQuotaBar
  planName="Enterprise Scale"
  planBadge="SLA 99.99%"
  resetDateText="2026-12-01 Auto Reset"
  {quotas}
  onupgrade={() => console.log('Upgrade clicked')}
/>
```

### `<TierFeatureComparison>`

Multi-tier pricing plan feature matrix and capability comparison table:
- Built for SaaS pricing pages, plan upgrade workflows, and entitlement boundaries.
- **Card-Style Headers**: Side-by-side tier cards with recommendation badges and current-plan state indicators.
- **Grouped Feature Rows**: Categorized rows supporting booleans, dash exclusions, and numeric limit values.

```svelte
<script lang="ts">
  import { TierFeatureComparison, type PricingTier, type FeatureGroup } from '@svadmin/ui';

  const tiers: PricingTier[] = [
    { key: 'starter', name: 'Starter', price: '$49', period: 'mo', isCurrent: true },
    { key: 'pro', name: 'Pro', price: '$199', period: 'mo', isPopular: true },
  ];

  const groups: FeatureGroup[] = [
    {
      groupName: 'Platform',
      features: [{ name: 'Multi-tenant isolation', values: { starter: true, pro: true } }],
    },
  ];
</script>

<TierFeatureComparison {tiers} {groups} onselecttier={(k) => console.log('Selected:', k)} />
```

### `<BillingInvoiceDrawer>`

Enterprise monthly settlement ledger and invoice detail drawer:
- Tailored for financial reconciliation, settlement review, and tax invoice issuance.
- **Settlement Overview**: Displays period ID, issue date, total amount, taxes, and payment status badges (Paid/Pending/Refunded).
- **Itemized Consumptions & PDF Download**: Granular item lists alongside electronic tax invoice PDF downloads.

```svelte
<script lang="ts">
  import { BillingInvoiceDrawer, type InvoiceData } from '@svadmin/ui';

  let open = $state(false);
  const invoice: InvoiceData = {
    invoiceNo: 'INV-202611-00812',
    period: 'October 2026',
    issueDate: '2026-11-01',
    status: 'paid',
    totalAmount: 18450,
    items: [{ id: '1', description: 'Enterprise Seats', category: 'Subscription', amount: 18450 }],
  };
</script>

<button onclick={() => (open = true)}>View Settlement Ledger</button>

<BillingInvoiceDrawer bind:open {invoice} />
### `<WebhookSimulator>`

Enterprise webhook event dispatch simulation and replay sandbox:
- Designed for developer portals, third-party webhook integrations, and sandbox testing.
- **Preset Events & Auto Fill**: Built-in presets for `order.payment_succeeded`, `user.security_alert`, and `invoice.issued` with automated JSON schema payload population.
- **Delivery Inspection**: Configurable target endpoint URL, automatic header generation, and live display of HTTP response codes, round-trip latency, and formatted response bodies.

```svelte
<script lang="ts">
  import { WebhookSimulator } from '@svadmin/ui';
</script>

<WebhookSimulator
  defaultEndpoint="https://api.merchant.com/webhooks/svadmin"
  ondeliver={async ({ eventType, endpoint }) => {
    return { statusCode: 200, durationMs: 76, responseBody: '{"ok": true}' };
  }}
/>
```

### `<HmacSignatureCalculator>`

HMAC signature calculation and live verification sandbox:
- Built for debugging webhook signature mismatches and payload integrity issues.
- **Hardware-accelerated Web Crypto**: Implemented with native `crypto.subtle` supporting `HMAC-SHA256`, `HMAC-SHA384`, and `HMAC-SHA512`.
- **Live Match Verification**: Computes hex digest in real-time, provides one-click copy, and verifies external signatures with instant valid/mismatch feedback.

```svelte
<script lang="ts">
  import { HmacSignatureCalculator } from '@svadmin/ui';
</script>

<HmacSignatureCalculator
  defaultSecret="whsec_prod_secret_8848"
  defaultBody={'{"event":"payment.succeeded"}'}
/>
```

### `<ApiPlayground>`

Embedded interactive API quick debugger and runner:
- Built for developer documentation, interactive API exploration, and microservice probing.
- **All Methods & cURL Export**: Covers GET, POST, PUT, PATCH, and DELETE with automated standard cURL command generation for terminal reproduction.
- **Response Inspection**: Live execution with response HTTP code, duration, payload size, and formatted JSON rendering.

```svelte
<script lang="ts">
  import { ApiPlayground } from '@svadmin/ui';
</script>

<ApiPlayground
  defaultMethod="POST"
  defaultUrl="/api/v1/orders"
  defaultBody={'{\n  "sku": "LICENSE"\n}'}
### `<WidgetContainer>`

Enterprise dashboard widget wrapper container:
- Standardized container shell for executive dashboards, operational metrics, and charts.
- **Full Lifecycle Controls**: Built-in header toolbar with one-click manual refresh animation, fullscreen toggle (ESC dismissal), timestamp indicators, and custom actions.
- **State Resiliency**: Embedded skeleton loading layout (`loading`) and user-friendly error retry cards (`error` + `onretry`).

```svelte
<script lang="ts">
  import { WidgetContainer } from '@svadmin/ui';

  const now = new Date();
</script>

<WidgetContainer
  title="Realtime QPS Throughput"
  description="Monitoring request volume fluctuations"
  lastUpdated={now}
  allowFullscreen={true}
  allowRefresh={true}
  onrefresh={() => console.log('Refreshing widget...')}
>
  <div class="h-40 flex items-center justify-center border border-dashed rounded text-xs text-muted-foreground">
    Embed any Chart or Metric component here
  </div>
</WidgetContainer>
```

### `<DataFreshnessIndicator>`

Data freshness indicator and auto-polling cadence pill:
- Tailored for operational cockpits and live monitoring dashboards to communicate data recency.
- **Pulsing State Dot**: Dynamic visual cues for `live` (pulsing green ping), `fresh`, `stale` (warning tone), and `offline`.
- **Interval Selector**: Toggle automatic background polling frequency (`5s`, `15s`, `30s`, `1m`, `off`) with manual click-to-sync triggers.

```svelte
<script lang="ts">
  import { DataFreshnessIndicator } from '@svadmin/ui';

  let lastSync = $state(Date.now());
</script>

<DataFreshnessIndicator
  lastUpdated={lastSync}
  pollInterval={15}
  onsyncnow={() => (lastSync = Date.now())}
/>
```

### `<ServerStatusGrid>`

Cluster server node health matrix and metric grid:
- Built for microservice clusters, edge nodes, and database read replicas.
- **Cluster Aggregation**: Automatic summary calculation for healthy, warning, and critical node counts alongside average network latency.
- **Multi-Resource Gauges**: Micro progress bars for CPU, Memory, and Disk usage with threshold-driven tone shifts.

```svelte
<script lang="ts">
  import { ServerStatusGrid, type ServerNode } from '@svadmin/ui';

  const nodes: ServerNode[] = [
    { id: '1', name: 'gateway-sh-01', region: 'cn-shanghai', status: 'healthy', latencyMs: 18, cpuPercent: 35, memoryPercent: 52 },
    { id: '2', name: 'gateway-bj-02', region: 'cn-beijing', status: 'warning', latencyMs: 140, cpuPercent: 78, memoryPercent: 84 },
  ];
</script>

<ServerStatusGrid {nodes} onselectnode={(n) => console.log('Selected:', n.name)} />
### `<QueryBuilder>`

Enterprise multi-level nested visual query and rule builder:
- Built for advanced BI dashboards, risk policy builders, and multi-dimensional operational datasets.
- **AND / OR Logical Grouping**: Supports recursive group nesting with intuitive indentation and boundary connections.
- **Type-adaptive Operators**: Automatic operator mapping for text (contains, starts_with, ends_with), numeric (gt, lt, between, equals), select/boolean (equals, in), and date fields.
- **Live SQL / JSON Export**: Native SQL WHERE clause serialization and structured JSON rule trees with one-click preview.

```svelte
<script lang="ts">
  import { QueryBuilder, type QueryField } from '@svadmin/ui';

  const fields: QueryField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ label: 'Approved', value: 'approved' }] },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'customer', label: 'Customer Name', type: 'text' },
  ];
</script>

<QueryBuilder {fields} onchange={(q) => console.log('Query changed:', q)} />
```

### `<FilterTagBar>`

Active filter tag capsule bar and saved preset view manager:
- Positioned above data tables to present all active filter conditions as dismissible badge tags.
- Supports individual filter removal (`x`) and quick "Clear All Filters".
- **Preset Views Persistence**: Save active filter combinations as named preset views in `localStorage`, toggleable via a fast dropdown picker.

```svelte
<script lang="ts">
  import { FilterTagBar } from '@svadmin/ui';

  let filters = $state([
    { id: '1', field: 'status', label: 'Status', operatorLabel: '=', valueLabel: 'Paid' },
  ]);
</script>

<FilterTagBar
  {filters}
  onremove={(id) => (filters = filters.filter((f) => f.id !== id))}
  onclear={() => (filters = [])}
/>
```

### `<BatchEditModal>`

Enterprise massive record batch edit and impact verification modal:
- Batch update multiple fields across dozens or hundreds of selected records.
- **Three Modification Modes**: Replace current value, Append (for tags/arrays), or Clear (set to NULL).
- **Impact Guard**: Prominently highlights affected record counts and requires secondary confirmation before applying mutations.

```svelte
<script lang="ts">
  import { BatchEditModal, type BatchFieldOption } from '@svadmin/ui';

  let open = $state(false);
  const fields: BatchFieldOption[] = [
    { key: 'assignee', label: 'Assignee', type: 'text' },
  ];
</script>

<button onclick={() => (open = true)}>Batch Edit Selected</button>

<BatchEditModal
  bind:open
  selectedCount={24}
  resourceName="Orders"
  {fields}
  onconfirm={(changes) => console.log('Applying batch changes:', changes)}
/>
```

### `<SqlConsole>` / `<DatabaseQueryRunner>`

Enterprise safe read-only SQL execution console and telemetry probe:
- **Destructive Query Protection**: Built-in AST guard strictly blocks write or DDL commands (`DROP`, `TRUNCATE`, `ALTER`, `DELETE`, `UPDATE`, `INSERT`), guaranteeing 100% read-only safety.
- **SQL Templates & Execution Metrics**: Pre-configured query templates, execution duration (ms), row count, and formatted results table with JSON/CSV export.

```svelte
<script lang="ts">
  import { SqlConsole } from '@svadmin/ui';
</script>

<SqlConsole
  title="Analytics Read-Only SQL Console"
  initialSql="SELECT id, order_no, amount, status FROM orders WHERE amount > 1000 LIMIT 20;"
  onExecuteQuery={async (sql) => {
    // E.g. execute read query via DataProvider
    return { columns: ['id', 'amount'], rows: [{ id: 1, amount: 2000 }], rowCount: 1, durationMs: 12 };
  }}
/>
```

### `<EnvVariableEditor>` / `<SecretVaultManager>`

Multi-environment configuration center and secret vault manager:
- **Multi-Environment Isolation**: Manage variables across `development`, `staging`, and `production` environments.
- **Masking & Security**: Obfuscate sensitive credentials with `●●●●●●●●` and toggle reveal with permission-aware controls.
- **Bulk .env Parser**: One-click import and export of raw `.env` formatted strings.

```svelte
<script lang="ts">
  import { EnvVariableEditor } from '@svadmin/ui';
</script>

<EnvVariableEditor
  environment="production"
  onSaveEnv={(vars, env) => console.log('Saved secrets for', env, vars)}
/>
```

### `<FeatureAnnouncementModal>` / `<WhatIsNewModal>`

Linear and Apple inspired "What's New" product release announcement modal:
- **Feature Highlights Stack**: Showcase version badges (`v0.5.15`), release dates, and categorized feature cards.
- **Do-Not-Disturb Persistence**: Store user dismissal preferences per version in `localStorage`.
- **Call-to-Action**: "Explore Now" and "Dismiss" workflow actions.

```svelte
<script lang="ts">
  import { FeatureAnnouncementModal } from '@svadmin/ui';

  let open = $state(true);
</script>

<FeatureAnnouncementModal
  bind:open
  version="v0.5.15"
  releaseDate="2026-11-11"
  onExplore={() => console.log('User navigated to new feature')}
/>
```

### `<MasterSubTableDrawer>` / `<NestedRecordExplorer>`

1:N Master-Detail relational explorer and nested line item drawer:
- **Master Record Overview**: Key master record property cards with auto-summarizing metrics.
- **Sub-Table Grid**: Nested table featuring independent search filtering, row deletion, and one-click line item insertion.
- **Bi-directional Sync**: Changes in child items update master summaries automatically.

```svelte
<script lang="ts">
  import { MasterSubTableDrawer } from '@svadmin/ui';

  let open = $state(false);
  let order = { orderNo: 'ORD-2026-901', customer: 'Acme Corp', totalAmount: '¥ 11,000' };
  let subItems = $state([
    { sku: 'HW-01', name: 'Server Rack 42U', quantity: 2, subtotal: '¥ 6,000' },
    { sku: 'HW-02', name: 'Fiber Cable 50m', quantity: 10, subtotal: '¥ 5,000' },
  ]);
</script>

<MasterSubTableDrawer
  bind:open
  masterRecord={order}
  bind:subItems
  subColumns={[
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Item Name' },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'subtotal', label: 'Subtotal', align: 'right' },
  ]}
/>
```

### `<ScheduledJobManager>` / `<CronSchedulerMatrix>`

Asynchronous scheduled jobs and cron execution management board:
- **Job Matrix**: List automated jobs, cron expressions, next execution countdowns, and last run statuses.
- **Manual Execution Trigger**: One-click "Trigger Now" button with immediate execution feedback.
- **Lifecycle Control**: Pause and resume job schedules on the fly.

```svelte
<script lang="ts">
  import { ScheduledJobManager } from '@svadmin/ui';
</script>

<ScheduledJobManager
  onTriggerJob={async (job) => console.log('Triggered job:', job.id)}
  onToggleJobStatus={(job, status) => console.log('Job status toggled:', job.id, status)}
/>
```

### `<SecureDataExporter>` / `<ExportSecurityWatermark>`

Enterprise secure data exporter with digital traceability fingerprints and audit controls:
- **Cryptographic Fingerprint Injection**: Embeds tamper-proof operator ID, timestamp, and signature hashes into exported CSV/TSV headers and metadata.
- **Mandatory Compliance Authorization**: Intercepts exports with a security confirmation modal presenting sensitive field warnings and required reason input.
- **Automated Audit Callback**: Notifies backend compliance services (`onExportAuditRecord`) with full payload metadata.

```svelte
<script lang="ts">
  import { SecureDataExporter } from '@svadmin/ui';

  const data = [{ id: 1, name: 'Alice', phone: '13800000000' }];
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'phone', label: 'Phone', isSensitive: true },
  ];
</script>

<SecureDataExporter
  {data}
  {columns}
  fileName="2026_q4_customer_audit"
  onExportAuditRecord={(audit) => console.log('Audit record:', audit)}
/>
```

### `<RolePermissionComparator>` / `<PermissionAuditDiffModal>`

Role permission modification diff comparator and privilege escalation audit modal:
- **Side-by-Side Diff Matrix**: Compares prior permissions vs proposed permissions across resources and CRUD actions (`read`, `create`, `update`, `delete`, `export`).
- **Privilege Escalation Warning**: Highlights sensitive high-risk grants (e.g. deletion of financial ledgers, mass export) with prominent alerts.
- **Mandatory Ticket Tracking**: Requires a validated approval ticket number before changes can be submitted.

```svelte
<script lang="ts">
  import { RolePermissionComparator } from '@svadmin/ui';
</script>

<RolePermissionComparator
  roleId="finance_lead"
  roleName="Finance Controller"
  onConfirmChanges={(payload) => console.log('Permission audit approved:', payload)}
/>
```

### `<TenantQuotasMatrix>` / `<QuotaEnforcementGuard>`

Multi-tenant resource quota monitoring dashboard and threshold enforcement guard:
- **Resource Progress Gauges**: Real-time meters for API calls, storage capacity, user seats, and compute points with status indicators (`normal`, `warning`, `exhausted`).
- **Enforcement & Recovery**: Provides one-click temporary quota request workflows and plan upgrade triggers.

```svelte
<script lang="ts">
  import { TenantQuotasMatrix } from '@svadmin/ui';
</script>

<TenantQuotasMatrix
  tenantName="Acme Enterprise"
  planName="Tier 3 Dedicated"
  onUpgradePlan={() => console.log('Upgrade plan requested')}
/>
```

### `<TableAggregationFooter>` / `<TableColumnSumSummary>`

Sticky bottom multi-dimensional table aggregation footer:
- **Dynamic Selection Summary**: Automatically calculates and updates sums or averages of currently checked rows in real-time.
- **Page Subtotal & Overall Total**: Renders page-level subtotals aligned to columns, alongside server-provided grand totals.
- **Precision & Formatting**: Supports custom currency prefixes (`¥`), decimal precision, and alignment synchronization.

```svelte
<script lang="ts">
  import { TableAggregationFooter } from '@svadmin/ui';

  const columns = [
    { key: 'orderNo', label: 'Order ID' },
    { key: 'amount', label: 'Amount', op: 'sum', prefix: '¥' },
  ];
</script>

<TableAggregationFooter
  {columns}
  pageRows={[{ orderNo: '1', amount: 100 }, { orderNo: '2', amount: 200 }]}
  selectedRows={[{ orderNo: '1', amount: 100 }]}
/>
```

### `<IncidentWarRoomDrawer>` / `<AlertIncidentTimeline>`

Production emergency incident war room drawer and alert response timeline:
- **Incident Severity & Impact**: Surfaces P0/P1 severity badges, impacted user counters, and incident duration.
- **Emergency Mitigations**: One-click quick-action buttons (Read-only throttling, cache flush, gateway isolation).
- **Incident Response Timeline**: Collaborative progress event log with resolution declaration action.

```svelte
<script lang="ts">
  import { IncidentWarRoomDrawer } from '@svadmin/ui';
</script>

<IncidentWarRoomDrawer
  incidentId="INC-2026-902"
  title="PostgreSQL Primary Connection Exhaustion"
  severity="P0"
  onTriggerMitigation={(action) => console.log('Mitigation executed:', action)}
/>
```

### `<DataImportDropzone>`

Enterprise bulk data import dropzone:
- Designed for large-scale Excel and CSV dataset ingestion.
- **Extension & Size Pre-Check**: Configurable extension whitelist (defaulting to `.xlsx`, `.xls`, `.csv`) alongside file size constraints.
- **Template Download & Progress**: Provides standard template download links and simulated parsing progress states.

```svelte
<script lang="ts">
  import { DataImportDropzone } from '@svadmin/ui';
</script>

<DataImportDropzone
  resourceName="Customers"
  templateUrl="/templates/customer-import.xlsx"
  onfileselect={(file) => console.log('File selected:', file.name)}
/>
```

### `<ColumnMappingTable>`

Source column to system field intelligent mapping table:
- Built for mapping external CSV/Excel headers to internal canonical schemas.
- **Smart Auto-Inference**: Automatically matches source headers to target fields by key/label fuzzy similarity.
- **Sample Inspection & Required Checks**: Previews sample values per column and highlights unmapped required fields with alerts.

```svelte
<script lang="ts">
  import { ColumnMappingTable } from '@svadmin/ui';

  const targetFields = [
    { key: 'name', label: 'Name', required: true },
    { key: 'phone', label: 'Phone', required: true },
  ];
  const sourceColumns = ['Full Name', 'Mobile Number'];
</script>

<ColumnMappingTable {targetFields} {sourceColumns} />
```

### `<ImportPreviewValidator>`

Pre-import record validator and inline cell corrector:
- Built for data cleansing and format validation before committing records to the database.
- **Filter by Error**: Toggles between all records and invalid rows only.
- **Inline Editing**: Highlights invalid cells in red with error messages, allowing direct inline correction before final submission.

```svelte
<script lang="ts">
  import { ImportPreviewValidator } from '@svadmin/ui';

  const columns = [{ key: 'name', label: 'Name' }];
  const rows = [{ name: 'Alice' }];
</script>

<ImportPreviewValidator {columns} {rows} onsubmit={(valid) => console.log('Submitting:', valid)} />
```

### `<PivotMatrix>` / `<CrossTableSummary>`

Multi-dimensional pivot matrix and cross-tabulation analysis table:
- Designed for financial closing, revenue reconciliation, and inventory cross-analysis.
- **Dynamic Cross Tabulation**: Dynamically groups records across row and column dimensions.
- **Multiple Aggregations**: Supports sum, avg, count, min, and max aggregations with custom number formatting.
- **Heatmap Shading & Totals**: Highlights cell values using semantic color intensity and computes row/column grand totals.

```svelte
<script lang="ts">
  import { PivotMatrix } from '@svadmin/ui';

  const data = [
    { region: 'East', dept: 'Software', quarter: 'Q1', revenue: 1200 },
    { region: 'East', dept: 'Hardware', quarter: 'Q1', revenue: 800 },
    { region: 'South', dept: 'Software', quarter: 'Q1', revenue: 950 }
  ];
</script>

<PivotMatrix {data} title="Revenue Pivot Analysis" />
```

### `<GeoScatterMap>` / `<RegionDistributionMap>`

Vector-based regional geographic distribution and scatter bubble map:
- Zero external mapping SDK dependencies; renders clean SVG geographic topology.
- **Scatter Bubble Scaling**: Proportional bubble radius based on regional metrics.
- **Ranking Leaderboard**: Integrated regional ranking progress tracks and status badges.

```svelte
<script lang="ts">
  import { GeoScatterMap } from '@svadmin/ui';

  const regions = [
    { id: 'east', name: 'East Region', value: 4820, x: 78, y: 58, status: 'highlight' },
    { id: 'south', name: 'South Region', value: 3650, x: 68, y: 82, status: 'normal' }
  ];
</script>

<GeoScatterMap {regions} title="Regional Compute Topology" metricLabel="Active Nodes" />
```

### `<DataMaskPolicyEngine>` / `<DataMaskCenter>`

Enterprise role-based data masking policy center and sandbox:
- Centralized data governance across sensitivity levels (L1 to L4).
- **Preset Rules & White-listing**: Built-in rules for mobile, national ID, bank card, email, and salary, mapped to exempt roles.
- **Interactive Sandbox**: Real-time client-side preview for verifying masking algorithms with instant feedback.

```svelte
<script lang="ts">
  import { DataMaskPolicyEngine } from '@svadmin/ui';
</script>

<DataMaskPolicyEngine onSavePolicies={(policies) => console.log('Saved:', policies)} />
```

### `<MockDataInterceptor>` / `<OfflineMockStudio>`

Frontend request interceptor and offline Mock API studio:
- Decouples frontend development from pending backend APIs and offline demo environments.
- **Global Killswitch**: Master toggle to enable or disable mock request interception.
- **Delay & Fault Simulation**: Simulates network latency (0~3000ms) and HTTP error status codes (200, 201, 403, 500).

```svelte
<script lang="ts">
  import { MockDataInterceptor } from '@svadmin/ui';
</script>

<MockDataInterceptor onToggleActive={(active) => console.log('Mock active:', active)} />
```

### `<SystemHealthCheckDashboard>` / `<DiagnosticInspector>`

System self-check, diagnostics, and service dependency inspection dashboard:
- Instant one-click health diagnosis for database, cache, storage, queue, and auth gateways.
- **KPI Summary Cards**: Overview of healthy, degraded, and failed services with average round-trip latency.
- **Exportable Audit Report**: Generates timestamped diagnostic reports in JSON or Markdown.

```svelte
<script lang="ts">
  import { SystemHealthCheckDashboard } from '@svadmin/ui';
</script>

<SystemHealthCheckDashboard onExportReport={(report) => console.log('Diagnostic report:', report)} />
```

### `<PivotMatrix>`

Multi-dimensional cross-tabulation pivot matrix:
- Designed for dimensional sales slicing, cross-period financial reconciliation, and BI reporting.
- **Dynamic Slicing & Aggregations**: Flexible row and column cross-pivoting with automatic subtotal and grand total calculations.

```svelte
<script lang="ts">
  import { PivotMatrix } from '@svadmin/ui';
</script>

<PivotMatrix rows={[{ key: 'region', label: 'Region' }]} cols={[{ key: 'quarter', label: 'Quarter' }]} measures={[{ key: 'revenue', label: 'Revenue', aggregation: 'sum' }]} data={[]} />
```

### `<GeoScatterMap>`

Pure SVG vector multi-region bubble scatter distribution map:
- Built for executive dashboards and regional operational density visualization without heavy external GIS dependencies.
- **Scatter Bubbles**: Dynamically maps regional coordinates with bubble sizes and color gradients based on metrics.

```svelte
<script lang="ts">
  import { GeoScatterMap } from '@svadmin/ui';
</script>

<GeoScatterMap title="Regional Order Density" regions={[]} />
```

### `<DataMaskPolicyEngine>`

Role-based enterprise dynamic data masking policy center:
- Built for regulatory compliance, privacy governance, and enterprise access auditing.
- **Multi-Level Masking**: Configures masking policies across sensitive assets (phone, identity, card) by role.

```svelte
<script lang="ts">
  import { DataMaskPolicyEngine } from '@svadmin/ui';
</script>

<DataMaskPolicyEngine policies={[]} />
```

### `<MockDataInterceptor>`

Frontend network request interceptor and offline mock studio:
- Built for offline development, latency simulation, and fault injection testing (500/403/timeout).

```svelte
<script lang="ts">
  import { MockDataInterceptor } from '@svadmin/ui';
</script>

<MockDataInterceptor rules={[]} />
```

### `<SystemHealthCheckDashboard>`

Comprehensive system service health diagnostics dashboard:
- Built for microservice clusters, dependency connectivity checks, and SLA health audits.

```svelte
<script lang="ts">
  import { SystemHealthCheckDashboard } from '@svadmin/ui';
</script>

<SystemHealthCheckDashboard services={[]} />
```

### `<AdminCopilotWidget>`

Enterprise admin floating AI copilot assistant:
- Built for AI-augmented enterprise dashboards and intelligent table filtering.
- **Floating Trigger & Expanded Card**: Persistent bottom-right floating trigger with pulsing glow, expanding into an interactive chat card.
- **Natural Language Filter Extraction**: Parses user queries into structured table filter suggestions with a one-click "Apply Filter" action.
- **Quick Prompt Chips**: Predefined clickable query chips for fast exploration.

```svelte
<script lang="ts">
  import { AdminCopilotWidget } from '@svadmin/ui';
</script>

<AdminCopilotWidget
  botName="SVAdmin Copilot"
  title="Financial & Sales Intelligent Copilot"
  onapplyfilter={(filter) => console.log('Applying filter:', filter)}
/>
```

### `<QueryAiExplainer>`

AI query and rule natural language explainer card:
- Designed to translate complex technical SQL expressions and JSON logic into plain business rules for non-technical users.
- **Plain Business Insights**: Automatically breaks down technical constraints (e.g. SQL WHERE clauses) into structured business bullets.
- **One-Click Actions**: Re-explain triggers alongside copy-to-clipboard functionality.

```svelte
<script lang="ts">
  import { QueryAiExplainer } from '@svadmin/ui';
</script>

<QueryAiExplainer
  contextName="Financial Ledger"
  queryText="WHERE (region = 'East' AND amount >= 50000) OR priority = 'URGENT'"
/>
```

### `<WorkflowGraphDesigner>`

Enterprise visual workflow graph and branch gateway designer:
- Built for multi-level enterprise approvals, conditional gateways, and BPMN 2.0 process modeling.
- **Node Topology**: Covers start nodes, conditional gateways, multi-approver nodes (sequential/parallel), CC nodes, and end nodes.

```svelte
<script lang="ts">
  import { WorkflowGraphDesigner } from '@svadmin/ui';
</script>

<WorkflowGraphDesigner />
```

### `<WorkflowExecutionTracker>`

Workflow instance runtime execution and audit tracker:
- Designed to visualize end-to-end approval progression.
- **Status Stepper**: Highlights completed approvals with timestamps and comments, pulsating active steps, and pending gateways.

```svelte
<script lang="ts">
  import { WorkflowExecutionTracker } from '@svadmin/ui';
</script>

<WorkflowExecutionTracker instanceId="FLOW-9921" steps={[]} />
```

### `<DataScopeRuleEditor>`

Row-level security (RLS) and data scope rule editor:
- Built for multi-tenant and divisional access control.
- **Granular Scopes**: Configures resource access by scope (all, department & sub-departments, department only, self only, or custom SQL expressions).

```svelte
<script lang="ts">
  import { DataScopeRuleEditor } from '@svadmin/ui';
</script>

<DataScopeRuleEditor roleName="Sales Manager" resources={[]} />
```

### `<ScreenAntiLeakGuard>` / `<WatermarkPolicyStudio>`

Dynamic screen anti-leak watermark guard with self-healing protection:
- Designed for enterprise compliance, classified trade secret protection, and camera anti-leak deterrence.
- **Self-Healing Protection**: Listens to DOM mutations via `MutationObserver` and restores itself if tampered with or hidden.
- **Repeating Matrix Overlay**: Displays employee identity, client IP, timestamp, and confidentiality notice.

```svelte
<script lang="ts">
  import { ScreenAntiLeakGuard } from '@svadmin/ui';
</script>

<ScreenAntiLeakGuard text="CONFIDENTIAL · DO NOT PHOTOGRAPH" subtext="Audit Active" />
```

### `<DataLineageGraph>` / `<FieldLineageTracker>`

Data asset full-chain lineage DAG and impact analysis topology:
- Designed to trace data source origin, ETL transforms, wide datasets, and downstream consumption endpoints.
- **Interactive Highlighting**: Clicking any node highlights full upstream and downstream dependency chains.
- **Metadata Inspector**: Details asset ownership, schedule frequency, record counts, and schema fields.

```svelte
<script lang="ts">
  import { DataLineageGraph } from '@svadmin/ui';
</script>

<DataLineageGraph title="Data Asset Lineage Graph" />
```

### `<LiveStreamLogViewer>` / `<TailLogConsole>`

High-performance real-time streaming log terminal:
- Designed for DevOps troubleshooting, scheduled job monitoring, and API gateway tail logs.
- **Smart Auto-Scroll**: Follows active tail stream automatically and pauses when scrolling history.
- **Filtering & Search**: Severity level pills (`INFO`, `WARN`, `ERROR`, `DEBUG`) and keyword matching.

```svelte
<script lang="ts">
  import { LiveStreamLogViewer } from '@svadmin/ui';
</script>

<LiveStreamLogViewer title="Microservice Tail Log Stream" />
```

### `<ElectronicSealStamp>` / `<ContractSigningPad>`

Vector electronic official seal stamp and approval badge:
- Pure SVG vector rendering with crisp resolution at any scale.
- **Authentic Circular Geometry**: Classic double outer rings, arc company name text path, and central star or approval status.
- **Distressed Vintage Ink Texture**: Slight random tilt angle and anti-counterfeiting serial numbers.

```svelte
<script lang="ts">
  import { ElectronicSealStamp } from '@svadmin/ui';
</script>

<ElectronicSealStamp companyName="Acme Enterprise Corp" sealTitle="Official Approval Seal" />
```

### `<SystemCapacityForecastCard>` / `<ResourceCapacityPredictor>`

System resource capacity consumption trend forecasting card:
- Predicts storage, memory, and API quota runout dates before hard limits are hit.
- **Countdown Alert**: Displays estimated days remaining until quota exhaustion.
- **Sparkline Trajectory**: Solid historical trend line extending into dashed predictive forecast.

```svelte
<script lang="ts">
  import { SystemCapacityForecastCard } from '@svadmin/ui';
</script>

<SystemCapacityForecastCard resourceName="PostgreSQL Cloud Storage" estimatedDaysRemaining={14} />
```

### `<TenantContextSwitcher>` / `<WorkspaceContextSwitcher>`

Multi-tenant, multi-workspace, and organization hierarchy switcher:
- Header and sidebar navigation control for switching subsidiaries, divisions, branches, and workspaces.
- **Fuzzy Search & Filtering**: Fast search by tenant name or code, with Enterprise and Pro tier badges.
- **Recent Tenants & Switch Guard**: Pins recently visited workspaces with async loading and management actions.

```svelte
<script lang="ts">
  import { TenantContextSwitcher } from '@svadmin/ui';
</script>

<TenantContextSwitcher currentTenantId="tenant-corp-01" />
```

### `<OmnibarCommandPalette>` / `<GlobalCommandOmnibar>`

Global `⌘+K` / `Ctrl+K` command palette and omnibar search:
- Centralized quick command dialog inspired by Raycast, Linear, and Stripe Command Menu.
- **Multi-Category Aggregation**: Unifies quick actions, page navigation, entity records, and AI prompts.
- **Full Keyboard Navigation**: Global hotkey listener, arrow key selection, Enter execution, and category chips.

```svelte
<script lang="ts">
  import { OmnibarCommandPalette } from '@svadmin/ui';

  let open = $state(false);
</script>

<OmnibarCommandPalette bind:open />
```

### `<AuditTrailInspector>` / `<SecurityAuditTimeline>`

Audit trail inspection waterfall and cross-tenant security tracker:
- Records tenant switching, privilege elevation, sensitive export, and destructive operation events.
- **Security Metric Counters**: Real-time counts of critical alerts, blocked attempts, and tenant switches.
- **Field Change Diffs**: Trace IDs, client IP geolocation, and before/after value diff inspections.

```svelte
<script lang="ts">
  import { AuditTrailInspector } from '@svadmin/ui';
</script>

<AuditTrailInspector />
```

### `<DashboardGridLayout>` / `<DynamicWidgetGrid>`

Enterprise 12-column responsive dashboard grid layout engine:
- Flexible widget composition canvas inspired by Grafana and Retool, supporting KPI scorecards, charts, and tables.
- **Dynamic Resize & Lock**: Adjusts widget column and row spans with single-widget static lock protection.
- **Edit vs View States**: Toggle edit mode to add sample widgets, resize, remove, or reset to default.

```svelte
<script lang="ts">
  import { DashboardGridLayout } from '@svadmin/ui';
</script>

<DashboardGridLayout />
```

### `<DashboardLayoutStorage>` / `<DashboardPresetManager>`

Multi-tenant and role-based dashboard preset manager:
- Save, switch, and manage Executive Cockpit, Financial Billing, and SRE Incident dashboard presets.
- **Save as New Preset**: Save current layout as a custom preset with role and description tags.
- **JSON Import & Export**: Export layout JSON for version control or cross-environment deployment.

```svelte
<script lang="ts">
  import { DashboardLayoutStorage } from '@svadmin/ui';
</script>

<DashboardLayoutStorage />
```

### `<ChartAnnotationOverlay>` / `<MetricEventAnnotation>`

Business milestone, outage incident, and threshold annotation layer:
- Overlays release milestones, campaign peak lines, and threshold alerts onto time-series charts.
- **Interactive Event Pins**: Percentage-anchored pins with tooltips expanding into root-cause details.
- **Semantic Status Tones**: Built-in release (`primary`), incident (`destructive`), promotion (`warning`), and target (`success`) tones.

```svelte
<script lang="ts">
  import { ChartAnnotationOverlay } from '@svadmin/ui';
</script>

<ChartAnnotationOverlay />
```

### `<AbacPolicyMatrix>` / `<AttributeBasedAccessControlMatrix>`

Enterprise Attribute-Based Access Control (ABAC) dynamic policy matrix:
- Evaluates subject attributes, object/data attributes, and environment constraints dynamically.
- **Multidimensional Decision Effects**: Supports `allow`, `mask` (data masking), `require_mfa` (stepped auth), and `deny`.
- **Attribute Conditions**: Supports `eq`, `in`, `gte`, and `lte` operators with priority ordering and toggle state.

```svelte
<script lang="ts">
  import { AbacPolicyMatrix } from '@svadmin/ui';
</script>

<AbacPolicyMatrix />
```

### `<PermissionSimulator>` / `<RolePermissionSandbox>`

Role and multidimensional attribute permission simulation sandbox:
- Lets administrators simulate access permissions of any employee without borrowing passwords.
- **Three-Column Simulation**: Analyzes navigation menu visibility, high-risk action decisions, and row-level security (RLS) SQL filters.
- **Security Clearance Inspection**: Shows employee clearance level (L1-L4) and simulated IP subnet.

```svelte
<script lang="ts">
  import { PermissionSimulator } from '@svadmin/ui';
</script>

<PermissionSimulator />
```

### `<WorkflowNodeInspector>` / `<ApprovalNodeDrawer>`

Workflow node property drawer and resolution configuration inspector:
- Dedicated configuration panel for workflow nodes created in `<WorkflowGraphDesigner>`.
- **Approver Assignment**: Choose between direct manager, role-based, specific employee, or submitter-selected approver.
- **Decision Resolution**: Supports consensus (unanimous approval), or-sign (first approval passes), and percentage-based voting.

```svelte
<script lang="ts">
  import { WorkflowNodeInspector } from '@svadmin/ui';

  let open = $state(false);
</script>

<WorkflowNodeInspector bind:open />
```

### `<MicroAppSandbox>` / `<SubAppRuntimeSandbox>`

Micro-frontend isolated sandbox runtime container:
- Shadow DOM and isolated iframe runtime with automatic auth token injection and theme synchronization.
- **Lifecycle Self-Healing**: Handles loading skeleton, healthy mounted, and crash boundary states with instant restart.
- **Fullscreen & Popout**: Expands the sub-app into a dedicated fullscreen workspace or opens it in a new tab.

```svelte
<script lang="ts">
  import { MicroAppSandbox } from '@svadmin/ui';
</script>

<MicroAppSandbox appName="BI Financial Analytics" src="https://bi.example.com/embed" />
```

### `<MicroAppStateBusIndicator>` / `<CrossAppStateBus>`

Cross-app reactive state bus and event message stream:
- PostMessage and BroadcastChannel state distribution mechanism across heterogeneous sub-apps.
- **Multichannel State Sync**: Broadcasts tenant switching, token refresh, and theme mode changes in milliseconds.
- **Message Stream Inspector**: Inspects connected sub-apps and recent message payloads with mock broadcast capabilities.

```svelte
<script lang="ts">
  import { MicroAppStateBusIndicator } from '@svadmin/ui';
</script>

<MicroAppStateBusIndicator />
```

### `<MicroAppRouteSync>` / `<SubAppUrlSynchronizer>`

Micro-frontend parent-child SPA route synchronization coordinator:
- Eliminates 404 page refresh failures and broken browser back/forward history in embedded micro-apps.
- **Bi-Directional Mapping**: Maps sub-app internal routes to host query parameters and synchronizes on popstate events.
- **Route Breadcrumb Stack**: Provides history back navigation and deep-link copying.

```svelte
<script lang="ts">
  import { MicroAppRouteSync } from '@svadmin/ui';
</script>

<MicroAppRouteSync initialRoute="/reports/quarterly-gmv/details" />
```

### `<NotificationCenter>` / `<NotificationDrawer>` (`<GlobalNoticeDrawer>`)

Enterprise global notification center and pending task drawer:
- **Header Micro-Interaction Trigger**: Bell icon, breathing pulse animation on unread messages, numeric badge with 99+ ceiling, and do-not-disturb (DND) mode.
- **Categorized Multi-Channel Tabs**: Filter notifications across All, Tasks (Pending Approvals), Announcements, and Security Alerts.
- **Quick Action Bar**: One-click "Mark All as Read", "Clear Read", and DND mode toggle.
- **Embedded Action Buttons**: Execute inline actions directly from notification cards (e.g., Approve, Reject, Download Export, View Details).

```svelte
<script lang="ts">
  import { NotificationCenter } from '@svadmin/ui';

  let notifications = [
    {
      id: 'task-1',
      title: 'Expense Reimbursement Pending',
      description: 'Employee submitted travel expense receipt for $320.',
      category: 'TASKS',
      read: false,
      createdAt: '5m ago',
      actions: [
        { id: 'approve', label: 'Approve', variant: 'primary' },
        { id: 'reject', label: 'Reject', variant: 'destructive' },
      ],
    },
    {
      id: 'sec-1',
      title: 'New Device Login Alert',
      description: 'Signed in from Chrome on macOS in Shanghai, CN.',
      category: 'SECURITY_ALERTS',
      read: false,
      createdAt: '1h ago',
    },
  ];
</script>

<NotificationCenter bind:items={notifications} />
```
