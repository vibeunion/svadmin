<script lang="ts">
  import {
    provideAdminContext,
    type DataProvider,
    type ResourceDefinition,
  } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import AboutSettings from '../../src/components/AboutSettings.svelte';

  let { resources = [] }: { resources?: ResourceDefinition[] } = $props();

  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://about-settings.example.test',
  } as DataProvider;

  provideAdminContext(definedReactiveOptions({
    dataProvider,
    get resources() { return resources; },
  }));
</script>

<AboutSettings />