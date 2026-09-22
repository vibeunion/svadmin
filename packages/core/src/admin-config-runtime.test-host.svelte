<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { untrack } from 'svelte';
  import { provideAdminConfig } from './admin-config-runtime.svelte';
  import type { AdminConfig } from './admin-config';
  import AdminConfigRuntimeTestProbe from './admin-config-runtime.test-probe.svelte';

  interface Props {
    config: AdminConfig;
  }

  let { config }: Props = $props();

  // App config is static for the lifetime of the tree; resolve it once at init.
  untrack(() => provideAdminConfig(config));

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
</script>

<QueryClientProvider client={queryClient}>
  <AdminConfigRuntimeTestProbe />
</QueryClientProvider>