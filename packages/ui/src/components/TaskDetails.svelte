<script lang="ts">
  import { useTask, getTaskProvider } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import type { TaskProvider, TaskRecord } from '@svadmin/core';
  import { Loader2 } from '@lucide/svelte';
  import * as Card from './ui/card/index.js';
  import { Badge } from './ui/badge/index.js';
  import TaskStatusBadge from './TaskStatusBadge.svelte';
  import TaskProgressBar from './TaskProgressBar.svelte';
  import RetryTaskButton from './RetryTaskButton.svelte';
  import CancelTaskButton from './CancelTaskButton.svelte';
  import {
    canCancelTask,
    canRetryTask,
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
    taskProvider = getTaskProvider({ optional: true }) as TaskProvider<TaskRecord> | undefined,
    title,
    useProviderData = !task && !!taskId,
    queryOptions,
  } = $props<{
    task?: TaskRecord;
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

  const query = useTask({
    get taskId() {
      return taskId;
    },
    get taskProvider() {
      return taskProvider;
    },
    get queryOptions() {
      return { enabled: useProviderData && !!taskId && !!taskProvider, ...queryOptions };
    },
  });

  const resolvedTask = $derived(task ?? query.data);
  const resolvedTitle = $derived(title ?? i18n.t('task.detailsTitle'));

  function formatDate(value: unknown) {
    if (!value) return '—';
    const date = new Date(value as string | Date);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function toPrettyJson(value: unknown) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
</script>

<Card.Root class="svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
  <Card.Header class="svadmin-u-7fcf9124b5df">
    <Card.Title class="svadmin-u-4ee734926ff6">{resolvedTitle}</Card.Title>
    <Card.Description>
      {#if resolvedTask}
        {resolveTaskTitle(resolvedTask)}
      {:else}
        {i18n.t('task.detailsSummary')}
      {/if}
    </Card.Description>
  </Card.Header>
  <Card.Content class="svadmin-u-b43b4c086d9a svadmin-u-9335c39f6eff">
    {#if useProviderData && taskProvider && query.isLoading}
      <div class="svadmin-u-60fbb7713999 svadmin-u-aadad6871af8 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-bfa603190748">
        <Loader2 class="svadmin-u-d2347e8497a9 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" />
        {i18n.t('task.loadingDetail')}
      </div>
    {:else if resolvedTask}
      <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <TaskStatusBadge status={String(resolvedTask.status ?? 'pending')} />
        <Badge variant="outline" class="svadmin-u-0e65706bcccd svadmin-u-359090c2d529">{resolvedTask.id}</Badge>
      </div>

      {#if typeof resolveTaskProgress(resolvedTask) === 'number'}
        <TaskProgressBar value={resolveTaskProgress(resolvedTask)} />
      {/if}

      <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-e4d6f343b9ff">
        <div class="svadmin-u-da7c36cd8867">
          <div class="svadmin-u-359090c2d529 uppercase svadmin-u-8baf13a3e9d7 svadmin-u-bfa603190748">{i18n.t('task.createdLabel')}</div>
          <div class="svadmin-u-fc7473ca09eb">{formatDate(resolveTaskCreatedAt(resolvedTask))}</div>
        </div>
        <div class="svadmin-u-da7c36cd8867">
          <div class="svadmin-u-359090c2d529 uppercase svadmin-u-8baf13a3e9d7 svadmin-u-bfa603190748">{i18n.t('task.updatedLabel')}</div>
          <div class="svadmin-u-fc7473ca09eb">{formatDate(resolveTaskUpdatedAt(resolvedTask))}</div>
        </div>
      </div>

      {#if resolveTaskMessage(resolvedTask)}
        <div class="svadmin-u-da7c36cd8867">
          <div class="svadmin-u-359090c2d529 uppercase svadmin-u-8baf13a3e9d7 svadmin-u-bfa603190748">{i18n.t('task.messageLabel')}</div>
          <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-2859c861d7de svadmin-u-eb6e8b881acd svadmin-u-fc7473ca09eb">{resolveTaskMessage(resolvedTask)}</div>
        </div>
      {/if}

      {#if resolveTaskError(resolvedTask)}
        <div class="svadmin-u-da7c36cd8867">
          <div class="svadmin-u-359090c2d529 uppercase svadmin-u-8baf13a3e9d7 svadmin-u-811148b13d1e">{i18n.t('task.errorLabel')}</div>
          <pre class="svadmin-u-73fc3fb18ceb svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-f0c1e65bd6f2 svadmin-u-7a0854fdbc30 svadmin-u-eb6e8b881acd svadmin-u-359090c2d529 svadmin-u-811148b13d1e">{toPrettyJson(resolveTaskError(resolvedTask))}</pre>
        </div>
      {/if}

      {#if resolveTaskResult(resolvedTask) !== undefined}
        <div class="svadmin-u-da7c36cd8867">
          <div class="svadmin-u-359090c2d529 uppercase svadmin-u-8baf13a3e9d7 svadmin-u-bfa603190748">{i18n.t('task.resultLabel')}</div>
          <pre class="svadmin-u-73fc3fb18ceb svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-967d113a1451 svadmin-u-eb6e8b881acd svadmin-u-359090c2d529">{toPrettyJson(resolveTaskResult(resolvedTask))}</pre>
        </div>
      {/if}

      <div class="svadmin-u-da7c36cd8867">
        <div class="svadmin-u-359090c2d529 uppercase svadmin-u-8baf13a3e9d7 svadmin-u-bfa603190748">{i18n.t('task.payloadLabel')}</div>
        <pre class="svadmin-u-73fc3fb18ceb svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-967d113a1451 svadmin-u-eb6e8b881acd svadmin-u-359090c2d529">{toPrettyJson(resolvedTask.payload ?? resolvedTask)}</pre>
      </div>

      {#if taskProvider?.retry || taskProvider?.cancel}
        <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-77a2a20e90d4 svadmin-u-f46b61a9b310">
          {#if taskProvider?.retry && canRetryTask(resolvedTask)}
            <RetryTaskButton taskId={resolvedTask.id} {taskProvider} />
          {/if}
          {#if taskProvider?.cancel && canCancelTask(resolvedTask)}
            <CancelTaskButton taskId={resolvedTask.id} {taskProvider} />
          {/if}
        </div>
      {/if}
    {:else}
      <div class="svadmin-u-60fbb7713999 svadmin-u-b5f3ff77f4f9 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
        {i18n.t('task.noSelection')}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
