<script lang="ts">
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import { definedOptions, definedReactiveOptions } from './defined-options';
  import { provideAdminContext } from './context.svelte';
  import type { TaskProvider, DataProvider, TaskRecord, ResourceDefinition } from './types';
  import type { TaskError } from './task-contract';
  import TaskHookProbe from './task-hooks.test-probe.svelte';
  import type { TaskHookState } from './task-hooks.test.types';

  let { provider, queryClient, taskId = 'task-1', queryParams, enabled = true, tenant = 'tenant-1', onTask, onError, onReady }: {
    provider?: TaskProvider;
    enabled?: boolean;
    queryClient: QueryClient;
    taskId?: string;
    queryParams?: Record<string, unknown>;
    tenant?: string;
    onTask?: (task: TaskRecord) => void;
    onError?: (error: TaskError) => void;
    onReady: (state: TaskHookState) => void;
  } = $props();
  const dataProvider: DataProvider = {
    getApiUrl: () => '/unused',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'unused' } }),
    create: async () => ({ data: { id: 'unused' } }),
    update: async () => ({ data: { id: 'unused' } }),
    deleteOne: async () => ({ data: { id: 'unused' } }),
  };
  const resources: ResourceDefinition[] = [];
  provideAdminContext(definedReactiveOptions({
    dataProvider, resources,
    get taskProvider() { return provider; },
    get tenant() { return { tenantId: tenant }; },
  }));
</script>

<QueryClientProvider client={queryClient}>
  <TaskHookProbe {enabled} {taskId} {onReady} {...definedOptions({ provider, queryParams, onTask, onError })} />
</QueryClientProvider>
