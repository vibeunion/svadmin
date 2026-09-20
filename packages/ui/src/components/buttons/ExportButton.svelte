<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useCan, useTranslation, useExport, useResourceContract, type TaskProvider, type ExportFormat, type Filter, type Sort } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { Button } from '../ui/button/index.js';
  import { Download } from '@lucide/svelte';
  import type { ButtonAccessControl } from './access-control';

  const i18n = useTranslation();

  let {
    resource,
    label,
    children,
    hideText = false,
    accessControl = { enabled: true, hideIfUnauthorized: true },
    taskName,
    taskProvider,
    taskIdempotencyKey,
    initialTaskId,
    onTaskSubmitted,
    filters,
    sorters,
    maxItemCount,
    format = 'csv',
    meta,
    class: className = '',
  } = $props<{
    resource: string;
    label?: string;
    children?: Snippet;
    hideText?: boolean;
    accessControl?: ButtonAccessControl;
    taskName?: string;
    taskProvider?: TaskProvider;
    taskIdempotencyKey?: string;
    initialTaskId?: string;
    onTaskSubmitted?: (taskId: string) => void | Promise<void>;
    filters?: Filter[];
    sorters?: Sort[];
    maxItemCount?: number;
    format?: ExportFormat;
    meta?: Record<string, unknown>;
    class?: string;
  }>();

  const binding = useResourceContract(() => resource);
  const can = useCan(() => ({
    resource,
    action: 'export',
    params: accessControl?.params,
    meta: accessControl?.meta,
    queryOptions: { enabled: accessControl?.enabled ?? true }
  }));
  const exporter = useExport(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get taskName() { return taskName; },
    get taskProvider() { return taskProvider; },
    get taskIdempotencyKey() { return taskIdempotencyKey; },
    get initialTaskId() { return initialTaskId; },
    get onTaskSubmitted() { return onTaskSubmitted; },
    get filters() { return filters; },
    get sorters() { return sorters; },
    get maxItemCount() { return maxItemCount; },
    get format() { return format; },
    get meta() { return meta ?? binding.meta; },
    get enabled() { return can.allowed; },
  }));
  const hidden = $derived(accessControl?.hideIfUnauthorized && !can.allowed);
  const taskDownloadReady = $derived(exporter.artifact !== undefined);
  const busy = $derived(exporter.isLoading || (exporter.isTaskPending && !exporter.taskError));
  const displayText = $derived(taskDownloadReady ? i18n.t('common.download')
    : exporter.taskError ? i18n.t('common.retry')
    : exporter.taskId && exporter.error ? i18n.t('common.error')
    : exporter.taskId && !exporter.isTaskPending ? i18n.t('task.status.cancelled')
    : busy ? i18n.t('common.processing') : label ?? i18n.t('common.export'));

  async function exportRecords() {
    if (!can.allowed || busy) return;
    if (exporter.taskError) {
      try { await exporter.refetchTask(); } catch { /* 查询错误由 hook 暴露。 */ }
      return;
    }
    if (taskDownloadReady) {
      exporter.downloadTask();
      return;
    }
    try { await exporter.triggerExport(); }
    catch {
      // The hook exposes a sanitized error; stale-scope cancellations remain silent.
    }
  }
</script>

{#if !hidden}
  <Button
    variant="outline"
    size={hideText ? 'icon' : 'sm'}
    class={className}
    aria-label={hideText ? displayText : undefined}
    disabled={busy || !can.allowed || (!!exporter.taskId && !taskDownloadReady && !exporter.taskError)}
    aria-busy={busy}
    onclick={exportRecords}
  >
    <Download class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
    {#if !hideText}
      <span class="svadmin-u-f58b02572ab2">
        {#if children && !taskName}
          {@render children()}
        {:else}
          {displayText}
        {/if}
      </span>
    {/if}
  </Button>
  {#if exporter.error || exporter.taskError}
    <p role="alert">{i18n.t('common.error')}</p>
  {/if}
{/if}
