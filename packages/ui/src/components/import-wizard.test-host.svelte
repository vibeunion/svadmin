<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AccessControlProvider, type HttpError, type ImportArtifactProvider, type TaskProvider } from '@svadmin/core';
  import { definedOptions, definedReactiveOptions } from '@svadmin/core/options';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import ImportWizard from './ImportWizard.svelte';
  import ImportLimitsProbe from './import-limits.test-probe.svelte';

  let {
    provider,
    resources,
    queryClient,
    resourceName = 'posts',
    open = true,
    onSuccess,
    tenant = 'first',
    permission,
    maxRows,
    maxBytes,
    coreProbe = false,
    onImportReady,
    taskProvider,
    taskArtifactProvider,
    taskName,
    retryTaskName,
    taskIdempotencyKey,
    initialTaskId,
    onTaskSubmitted,
  }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resourceName?: string;
    open?: boolean;
    onSuccess?: (result: { succeeded: number; failed: number }) => void;
    tenant?: string;
    permission?: AccessControlProvider;
    maxRows?: number;
    maxBytes?: number;
    coreProbe?: boolean;
    onImportReady?: (driver: { handleChange(info: { file: File }): Promise<unknown>; readonly error: HttpError | null }) => void;
    taskProvider?: TaskProvider;
    taskArtifactProvider?: ImportArtifactProvider;
    taskName?: string;
    retryTaskName?: string;
    taskIdempotencyKey?: string;
    initialTaskId?: string;
    onTaskSubmitted?: (taskId: string) => void;
  } = $props();

  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return permission; },
    get taskProvider() { return taskProvider; },
  }));
</script>

<QueryClientProvider client={queryClient}>
  {#if coreProbe}
    <ImportLimitsProbe {resourceName} {maxRows} {maxBytes} onReady={onImportReady} />
  {:else}
    <ImportWizard {resourceName} {open} {...definedOptions({
      onSuccess, maxRows, maxBytes, taskProvider, taskArtifactProvider, taskName, retryTaskName, taskIdempotencyKey, initialTaskId, onTaskSubmitted,
    })} />
  {/if}
</QueryClientProvider>
