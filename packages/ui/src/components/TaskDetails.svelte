<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { useTask, getTaskProvider } from '@svadmin/core';
  import { decodeTaskRecord } from '@svadmin/core/schema';
  import { useTranslation } from '@svadmin/core/i18n';

  import type { TaskProvider, TaskRecord } from '@svadmin/core';
  import * as Card from './ui/card/index.js';
  import { Badge } from './ui/badge/index.js';
  import TaskStatusBadge from './TaskStatusBadge.svelte';
  import TaskProgressBar from './TaskProgressBar.svelte';
  import RetryTaskButton from './RetryTaskButton.svelte';
  import CancelTaskButton from './CancelTaskButton.svelte';
  import DataState from './content/DataState.svelte';
  import {
    canCancelTask,
    canRetryTask,
    formatTaskDate,
    resolveTaskCreatedAt,
    resolveTaskError,
    resolveTaskMessage,
    resolveTaskProgress,
    resolveTaskResult,
    resolveTaskTitle,
    resolveTaskUpdatedAt,
  } from './task-utils.js';

  const i18n = useTranslation();

  let {
    task,
    taskId,
    taskProvider = getTaskProvider({ optional: true }) ?? undefined,
    title,
    useProviderData = !task && !!taskId,
    queryOptions,
  } = $props<{
    task?: TaskRecord | undefined;
    taskId?: string;
    taskProvider?: TaskProvider<TaskRecord>;
    title?: string;
    useProviderData?: boolean;
    queryOptions?: {
      enabled?: boolean;
      staleTime?: number;
      gcTime?: number;
      refetchOnWindowFocus?: boolean;
      refetchInterval?: number | false;
      refetchIntervalInBackground?: boolean;
    };
  }>();

  const canRead = $derived(useProviderData && !!taskId && !!taskProvider && queryOptions?.enabled !== false);
  const query = useTask({
    errorNotification: false,
    get taskId() {
      return taskId;
    },
    get taskProvider() {
      return taskProvider;
    },
    get queryOptions() {
      return { ...queryOptions, enabled: canRead };
    },
  });

  const view = $derived.by(() => {
    const value = task === undefined ? query.data : task;
    try {
      return { data: value === undefined ? undefined : decodeTaskRecord(value, taskId), invalid: false };
    } catch {
      return { data: undefined, invalid: true };
    }
  });
  const resolvedTask = $derived(useProviderData && (query.isError || query.isLoading) ? undefined : view.data);
  const resolvedTitle = $derived(title ?? i18n.t('task.detailsTitle'));

  function retryRead(): void {
    if (!canRead || query.isFetching) return;
    void query.refetch({ cancelRefetch: false });
  }


  function toPrettyJson(value: unknown) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
</script>

<Card.Root class="border-border/40 shadow-sm">
  <Card.Header class="pb-3">
    <Card.Title class="text-base">{resolvedTitle}</Card.Title>
    <Card.Description>
      {#if resolvedTask}
        {resolveTaskTitle(resolvedTask)}
      {:else}
        {i18n.t('task.detailsSummary')}
      {/if}
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-5 pt-0">
    {#if view.invalid}
      <p role="alert">{i18n.t('validation.invalidFormat')}</p>
    {:else if useProviderData && query.isError}
      <DataState
        state="error"
        title={i18n.t('common.error')}
        description={i18n.t('task.fetchFailed')}
        {...definedOptions({ retry: !canRead || query.isFetching ? undefined : retryRead })}
      />
    {:else if useProviderData && taskProvider && query.isLoading}
      <DataState state="loading" loadingLabel={i18n.t('task.loadingDetail')} />
    {:else if resolvedTask}
      <div class="flex flex-wrap items-center gap-2">
        <TaskStatusBadge status={String(resolvedTask.status ?? 'pending')} />
        <Badge variant="outline" class="font-mono text-xs">{resolvedTask.id}</Badge>
      </div>

      {#if typeof resolveTaskProgress(resolvedTask) === 'number'}
        <TaskProgressBar {...definedOptions({ "value": resolveTaskProgress(resolvedTask) })} />
      {/if}

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{i18n.t('task.createdLabel')}</div>
          <div class="text-sm">{formatTaskDate(resolveTaskCreatedAt(resolvedTask), i18n.locale)}</div>
        </div>
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{i18n.t('task.updatedLabel')}</div>
          <div class="text-sm">{formatTaskDate(resolveTaskUpdatedAt(resolvedTask), i18n.locale)}</div>
        </div>
      </div>

      {#if resolveTaskMessage(resolvedTask)}
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{i18n.t('task.messageLabel')}</div>
          <div class="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">{resolveTaskMessage(resolvedTask)}</div>
        </div>
      {/if}

      {#if resolveTaskError(resolvedTask)}
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-destructive">{i18n.t('task.errorLabel')}</div>
          <pre class="overflow-auto rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{toPrettyJson(resolveTaskError(resolvedTask))}</pre>
        </div>
      {/if}

      {#if resolveTaskResult(resolvedTask) !== undefined}
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{i18n.t('task.resultLabel')}</div>
          <pre class="overflow-auto rounded-md border border-border/60 bg-muted/20 p-3 text-xs">{toPrettyJson(resolveTaskResult(resolvedTask))}</pre>
        </div>
      {/if}

      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wide text-muted-foreground">{i18n.t('task.payloadLabel')}</div>
        <pre class="overflow-auto rounded-md border border-border/60 bg-muted/20 p-3 text-xs">{toPrettyJson(resolvedTask.payload ?? resolvedTask)}</pre>
      </div>

      {#if taskProvider?.retry || taskProvider?.cancel}
        <div class="flex flex-wrap gap-2 pt-2">
          {#if taskProvider?.retry && canRetryTask(resolvedTask)}
            <RetryTaskButton taskId={resolvedTask.id} {taskProvider} />
          {/if}
          {#if taskProvider?.cancel && canCancelTask(resolvedTask)}
            <CancelTaskButton taskId={resolvedTask.id} {taskProvider} />
          {/if}
        </div>
      {/if}
    {:else}
      <div class="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {i18n.t('task.noSelection')}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
