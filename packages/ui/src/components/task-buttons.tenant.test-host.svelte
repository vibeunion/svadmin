<script lang="ts">
  import {
    provideAdminContext,
    type DataProvider,
    type TaskProvider,
    type TenantContext,
  } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import CancelTaskButton from './CancelTaskButton.svelte';
  import RetryTaskButton from './RetryTaskButton.svelte';
  import { definedOptions } from '@svadmin/core/options';

  interface Props {
    action: 'cancel' | 'retry';
    taskId: string;
    taskProvider: TaskProvider;
    tenant: TenantContext;
    queryClient: QueryClient;
    onSuccess: () => void;
    onError?: (error: unknown) => void;
  }

  const {
    action,
    taskId,
    taskProvider,
    tenant,
    queryClient,
    onSuccess,
    onError,
  }: Props = $props();

  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://task-buttons.example.test',
  } satisfies DataProvider;

  provideAdminContext({
    dataProvider,
    resources: [],
    get taskProvider() { return taskProvider; },
    get tenant() { return tenant; },
  });
</script>

<QueryClientProvider client={queryClient}>
  {#if action === 'cancel'}
    <CancelTaskButton {taskId} {taskProvider} {onSuccess} {...definedOptions({ onError })}>Cancel scoped task</CancelTaskButton>
  {:else}
    <RetryTaskButton {taskId} {taskProvider} {onSuccess} {...definedOptions({ onError })}>Retry scoped task</RetryTaskButton>
  {/if}
</QueryClientProvider>
