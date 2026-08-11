<script lang="ts">
  import {
    provideAdminContext,
    type ChatProvider,
    type DataProvider,
    type TenantContext,
  } from '@svadmin/core';
  import SmartSuggest from './SmartSuggest.svelte';

  let {
    chatProvider,
    tenant,
    context,
  }: {
    chatProvider: ChatProvider;
    tenant: TenantContext;
    context: string;
  } = $props();

  const fallbackDataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://smart-suggest-value-scope.example.test',
  } as DataProvider;

  provideAdminContext({
    dataProvider: fallbackDataProvider,
    resources: [],
    get chatProvider() { return chatProvider; },
    get tenant() { return tenant; },
  });

  let controlledValue = $state('');
</script>

<SmartSuggest bind:value={controlledValue} {context} />
<button type="button" onclick={() => { controlledValue = 'fresh'; }}>Set parent value</button>
