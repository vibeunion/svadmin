<script lang="ts">
  import type { ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { AdminApp } from '@svadmin/ui';
  import { demoContracts } from '../../src/resource-contracts';
  import UserManagementPage from '../../src/features/people/UserManagementPage.svelte';
  import { inMemoryDataProvider as dataProvider } from '../../src/providers/inMemoryDb';

  const resourceNames = ['users', 'roles', 'permissions', 'user_accounts', 'user_logs', 'user_settings'] as const;
  const resources: ResourceDefinition[] = resourceNames.map((name) => ({
    name,
    label: name,
    contract: demoContracts[name],
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

<AdminApp {dataProvider} {resources} {routerProvider} locale="en">
  {#snippet dashboard()}
    <UserManagementPage resourceName="users" />
  {/snippet}
</AdminApp>
