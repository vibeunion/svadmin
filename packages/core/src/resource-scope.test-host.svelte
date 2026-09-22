<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { untrack } from 'svelte';
  import { provideAdminConfig } from './admin-config-runtime.svelte';
  import type { AdminConfig } from './admin-config';
  import type { ResourceScope } from './resource-scope.svelte';
  import ResourceScopeTestInner from './resource-scope.test-inner.svelte';

  interface Props {
    config: AdminConfig;
    scope: ResourceScope;
  }

  let { config, scope }: Props = $props();

  untrack(() => provideAdminConfig(config));

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
</script>

<QueryClientProvider client={queryClient}>
  <ResourceScopeTestInner {scope} />
</QueryClientProvider>