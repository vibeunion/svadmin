<script lang="ts">
  import type { BaseRecord, DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { AdminApp } from '@svadmin/ui';
  import UserManagementPage from '../../src/pages/UserManagementPage.svelte';

  const records: Record<string, BaseRecord[]> = {
    users: [
      { id: 1, name: 'Jordan Lee', email: 'jordan.lee@example.com', roleId: 1, status: 'active', department: 'Platform Operations', lastActiveAt: '2026-06-11' },
      { id: 2, name: 'Priya Raman', email: 'priya.raman@example.com', roleId: 2, status: 'active', department: 'Warehouse', lastActiveAt: '2026-06-10' },
      { id: 3, name: 'Mateo Silva', email: 'mateo.silva@example.com', roleId: 3, status: 'invited', department: 'Planning', lastActiveAt: '2026-06-09' },
      { id: 4, name: 'Evelyn Brooks', email: 'evelyn.brooks@example.com', roleId: 4, status: 'active', department: 'Finance', lastActiveAt: '2026-06-07' },
    ],
    roles: [
      { id: 1, name: 'Inventory Admin', slug: 'inventory-admin', scope: 'Inventory', level: 'Admin' },
      { id: 2, name: 'Warehouse Manager', slug: 'warehouse-manager', scope: 'Warehouse', level: 'Manager' },
      { id: 3, name: 'Operations Analyst', slug: 'operations-analyst', scope: 'Operations', level: 'Analyst' },
      { id: 4, name: 'Read Only Auditor', slug: 'read-only-auditor', scope: 'Finance', level: 'Read only' },
    ],
    permissions: [],
    user_accounts: [],
    user_logs: [],
    user_settings: [],
  };

  const dataProvider = {
    getList: async ({ resource }) => ({ data: records[resource] ?? [], total: records[resource]?.length ?? 0 }),
    getOne: async ({ resource, id }) => ({ data: records[resource]?.find((record) => record.id === id) ?? { id } }),
    create: async ({ variables }) => ({ data: { id: 'created', ...variables } }),
    update: async ({ id, variables }) => ({ data: { id, ...variables } }),
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://example.test',
  } as DataProvider;

  const resources: ResourceDefinition[] = Object.keys(records).map((name) => ({
    name,
    label: name,
    fields: name === 'users' ? [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
    ] : [],
  }));

  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };
</script>

{#snippet dashboard()}
  <UserManagementPage resourceName="users" />
{/snippet}

<AdminApp {dataProvider} {resources} {routerProvider} locale="en" dashboard={dashboard as never} />
