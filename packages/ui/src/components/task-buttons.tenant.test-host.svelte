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

  interface Props {
    action: 'cancel' | 'retry';
    taskId: string;
    taskProvider: TaskProvider;
    tenant: TenantContext;
    queryClient: QueryClient;
    onSuccess: () => void;
  }

  const {
    action,
    taskId,
    taskProvider,
    tenant,
    queryClient,
    onSuccess,
  }: Props = $props();

  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://task-buttons.example.test',
  } as DataProvider;

  provideAdminContext({
    dataProvider,
    resources: [],
    get taskProvider() { return taskProvider; },
    get tenant() { return tenant; },
  });
</script>

<QueryClientProvider client={queryClient}>
  {#if action === 'cancel'}
    <CancelTaskButton {taskId} {taskProvider} {onSuccess}>Cancel scoped task</CancelTaskButton>
  {:else}
    <RetryTaskButton {taskId} {taskProvider} {onSuccess}>Retry scoped task</RetryTaskButton>
  {/if}
</QueryClientProvider>
