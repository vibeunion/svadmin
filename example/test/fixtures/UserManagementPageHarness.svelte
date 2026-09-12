<script lang="ts">
  import type { ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { AdminApp } from '@svadmin/ui';
  import UserManagementPage from '../../src/pages/UserManagementPage.svelte';
  import { inMemoryDataProvider as dataProvider } from '../../src/providers/inMemoryDb';
  import { createResources } from '../../src/resources';

  const targetNames = new Set(['users', 'roles', 'permissions', 'user_accounts', 'user_logs', 'user_settings']);
  const resources: ResourceDefinition[] = createResources('en').filter((resource) => targetNames.has(resource.name));

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
