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
  const taskProvider = createSupaCloudTaskProvider({
    supacloud: supacloud.tasks,
    clientKind: 'sdk',
  });

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
