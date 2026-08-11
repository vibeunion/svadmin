<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
    type DataProviderInput,
    type ResourceDefinition,
    type TenantContext,
  } from '@svadmin/core';
  import InferencerPanel from './InferencerPanel.svelte';
  import RolesSettings from './RolesSettings.svelte';

  let {
    consumer,
    dataProvider,
    authProvider,
    resources,
    tenant,
  }: {
    consumer: 'inferencer' | 'roles';
    dataProvider?: DataProviderInput;
    authProvider?: AuthProvider;
    resources: ResourceDefinition[];
    tenant: TenantContext;
  } = $props();

  const fallbackDataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://scoped-provider-actions.example.test',
  } as DataProvider;

  provideAdminContext({
    get dataProvider() { return dataProvider ?? fallbackDataProvider; },
    get authProvider() { return authProvider; },
    get resources() { return resources; },
    get tenant() { return tenant; },
  });
</script>

{#if consumer === 'inferencer'}
  <InferencerPanel />
{:else}
  <RolesSettings />
{/if}
