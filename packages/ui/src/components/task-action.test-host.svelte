<script lang="ts">
  import { provideAdminContext, type TaskProvider, type DataProvider, type AccessControlProvider, type ResourceDefinition } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import CancelTaskButton from './CancelTaskButton.svelte';
  import RetryTaskButton from './RetryTaskButton.svelte';
  let { provider, queryClient, action, taskId = 'one', tenant = 'first', access,
    disabled = false, onSuccess, onError }: {
    provider: TaskProvider;
    queryClient: QueryClient;
    action: 'cancel' | 'retry';
    taskId?: string;
    tenant?: string;
    access?: AccessControlProvider;
    disabled?: boolean;
    onSuccess: () => void;
    onError: (error: unknown) => void;
  } = $props();
  const dataProvider: DataProvider = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  provideAdminContext(definedReactiveOptions({
    dataProvider, resources: [] as ResourceDefinition[],
    get taskProvider() { return provider; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return access; },
  }));
</script>

<QueryClientProvider client={queryClient}>
  {#if action === 'cancel'}
    <CancelTaskButton {taskId} {disabled} {onSuccess} {onError} />
  {:else}
    <RetryTaskButton {taskId} {disabled} {onSuccess} {onError} />
  {/if}
</QueryClientProvider>
