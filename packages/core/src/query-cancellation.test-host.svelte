<script lang="ts">
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import { provideAdminContext } from './context.svelte';
  import type { DataProvider } from './types';
  import Probe from './query-cancellation.test-probe.svelte';

  let { dataProvider, client, kind, first = true, second = false }: {
    dataProvider: DataProvider;
    client: QueryClient;
    kind: string;
    first?: boolean;
    second?: boolean;
  } = $props();

  provideAdminContext({
    get dataProvider() { return dataProvider; },
    resources: [{ name: 'posts', label: 'Posts', fields: [], primaryKey: 'id' }],
  });
</script>

<QueryClientProvider {client}>
  {#if first}<Probe {kind} />{/if}
  {#if second}<Probe {kind} />{/if}
</QueryClientProvider>
