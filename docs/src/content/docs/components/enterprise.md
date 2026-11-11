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
