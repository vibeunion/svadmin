<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
    type ResourceDefinition,
  } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import SecuritySettings from '../../src/components/SecuritySettings.svelte';

  let { authProvider }: { authProvider?: AuthProvider } = $props();

  const resources: ResourceDefinition[] = [];

  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://security-settings.example.test',
  } as DataProvider;

  provideAdminContext(definedReactiveOptions({
    dataProvider,
    resources,
    get authProvider() { return authProvider; },
  }));
</script>

<SecuritySettings />