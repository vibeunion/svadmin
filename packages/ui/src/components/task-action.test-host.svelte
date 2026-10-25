<script lang="ts">
  import { provideAdminContext, type TaskProvider, type DataProvider, type AccessControlProvider, type ResourceDefinition, type TaskRecord } from '@svadmin/core';
  import { definedOptions, definedReactiveOptions } from '@svadmin/core/options';
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import CancelTaskButton from './CancelTaskButton.svelte';
  import RetryTaskButton from './RetryTaskButton.svelte';
  import TaskList from './TaskList.svelte';
  import TaskDetails from './TaskDetails.svelte';
  let { provider, queryClient, action, taskId = 'one', tenant = 'first', access,
    disabled = false, onSuccess, onError, surface = 'actions', tasks = [], onSelect,
    selectedTaskId = 'one' }: {
    provider: TaskProvider;
    queryClient: QueryClient;
    action: 'cancel' | 'retry' | 'both';
    taskId?: string;
    tenant?: string;
    access?: AccessControlProvider;
    disabled?: boolean;
    onSuccess: () => void;
    onError: ((error: unknown) => void) | undefined;
    surface?: 'actions' | 'list' | 'details';
    tasks?: TaskRecord[];
    onSelect?: (task: TaskRecord) => void;
    selectedTaskId?: string;
  } = $props();
  // svelte-ignore state_referenced_locally
  let selection = $state(selectedTaskId);
  const dataProvider: DataProvider = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const resources: ResourceDefinition[] = [];
  provideAdminContext(definedReactiveOptions({
    dataProvider, resources,
    get taskProvider() { return provider; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return access; },
  }));
</script>

<QueryClientProvider client={queryClient}>
  {#if surface === 'list'}
    <TaskList tasks={tasks} taskProvider={provider} useProviderData={false} onSelect={(task) => {
      onSelect?.(task);
      selection = task.id;
    }} />
    <output data-testid="selected-task">{selection}</output>
  {:else if surface === 'details'}
    <TaskDetails task={tasks[0]} taskProvider={provider} useProviderData={false} />
  {:else if action === 'both'}
    <RetryTaskButton {taskId} {disabled} {onSuccess} {...definedOptions({ onError })} />
    <CancelTaskButton {taskId} {disabled} {onSuccess} {...definedOptions({ onError })} />
  {:else if action === 'cancel'}
    <CancelTaskButton {taskId} {disabled} {onSuccess} {...definedOptions({ onError })} />
  {:else}
    <RetryTaskButton {taskId} {disabled} {onSuccess} {...definedOptions({ onError })} />
  {/if}
</QueryClientProvider>
