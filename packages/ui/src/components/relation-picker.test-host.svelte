<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AccessControlProvider } from '@svadmin/core';
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import type { ComponentProps } from 'svelte';
  import RelationPicker from './RelationPicker.svelte';
  let { provider, resources, client, tenant = 'first', access = null, settings = {} }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    client: QueryClient;
    tenant?: string;
    access?: AccessControlProvider | null;
    settings?: Partial<ComponentProps<typeof RelationPicker>>;
  } = $props();
  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return access; },
  });
</script>

<QueryClientProvider {client}>
  <RelationPicker resource="posts" {...settings} />
</QueryClientProvider>
