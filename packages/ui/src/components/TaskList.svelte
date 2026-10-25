<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { useTaskList, getTaskProvider } from '@svadmin/core';
  import { decodeTaskList } from '@svadmin/core/schema';
  import { useTranslation } from '@svadmin/core/i18n';

  import type { TaskProvider, TaskRecord } from '@svadmin/core';
  import { Loader2 } from '@lucide/svelte';
  import * as Card from './ui/card/index.js';
  import * as Table from './ui/table/index.js';
  import { Button } from './ui/button/index.js';
  import TaskStatusBadge from './TaskStatusBadge.svelte';
  import TaskProgressBar from './TaskProgressBar.svelte';
  import RetryTaskButton from './RetryTaskButton.svelte';
  import CancelTaskButton from './CancelTaskButton.svelte';
  import DataState from './content/DataState.svelte';
  import {
    canCancelTask,
    canRetryTask,
    formatTaskDate,
    resolveTaskMessage,
    resolveTaskProgress,
    resolveTaskTitle,
    resolveTaskUpdatedAt,
  } from './task-utils.js';

  const i18n = useTranslation();

  let {
    tasks,
    taskProvider = getTaskProvider({ optional: true }) ?? undefined,
    params,
    dlq = false,
    title,
    emptyText,
    showActions = true,
    showProgress = true,
    useProviderData = !tasks,
    queryOptions,
    onSelect,
  } = $props<{
    tasks?: TaskRecord[];
    taskProvider?: TaskProvider<TaskRecord>;
    params?: Record<string, unknown>;
    dlq?: boolean;
    title?: string;
    emptyText?: string;
    showActions?: boolean;
    showProgress?: boolean;
    useProviderData?: boolean;
    queryOptions?: {
      enabled?: boolean;
      staleTime?: number;
      gcTime?: number;
      refetchOnWindowFocus?: boolean;
      refetchInterval?: number | false;
      refetchIntervalInBackground?: boolean;
    };
    onSelect?: (task: TaskRecord) => void;
  }>();

  const hasReadCapability = $derived(typeof (dlq ? taskProvider?.listDlq : taskProvider?.list) === 'function');
  const readUnavailable = $derived(useProviderData && !hasReadCapability);
  const canRead = $derived(useProviderData && hasReadCapability && queryOptions?.enabled !== false);
  const query = useTaskList({
    errorNotification: false,
    get params() {
      return params;
    },
    get dlq() {
      return dlq;
    },
    get taskProvider() {
      return taskProvider;
    },
    get queryOptions() {
      return { ...queryOptions, enabled: canRead };
    },
  });

  const view = $derived.by(() => {
    try {
      return { data: decodeTaskList({ data: tasks === undefined ? query.data?.data ?? [] : tasks }).data, invalid: false };
    } catch {
      return { data: [], invalid: true };
    }
  });
  const resolvedTasks = $derived(view.data);
  const keyedTasks = $derived.by(() => {
    const occurrences = new Map<string, number>();
    return resolvedTasks.map(task => {
      const occurrence = occurrences.get(task.id) ?? 0;
      occurrences.set(task.id, occurrence + 1);
      return { task, key: JSON.stringify([task.id, occurrence]) };
    });
  });
  const resolvedTitle = $derived(title ?? (dlq ? i18n.t('task.dlqTitle') : i18n.t('task.listTitle')));
  const resolvedEmptyText = $derived(emptyText ?? (dlq ? i18n.t('task.noDlq') : i18n.t('task.noTasks')));

  function retryRead(): void {
    if (!canRead || query.isFetching) return;
    void query.refetch({ cancelRefetch: false });
  }

  function selectRow(event: MouseEvent, task: TaskRecord): void {
    if (event.target instanceof Element
      && event.target.closest('button, a, input, select, textarea, [role="button"]')) return;
    onSelect?.(task);
  }

</script>

<Card.Root class="svadmin-u-6ee2d41e2d2d svadmin-u-438b2237b8d6">
  <Card.Header class="svadmin-u-7fcf9124b5df">
    <Card.Title class="svadmin-u-4ee734926ff6">{resolvedTitle}</Card.Title>
    {#if !readUnavailable}
      <Card.Description>
      {#if useProviderData && taskProvider}
        {i18n.t('task.count', { count: (query.data?.total ?? resolvedTasks.length) || 0 })}
      {:else}
        {i18n.t('task.count', { count: resolvedTasks.length })}
      {/if}
      </Card.Description>
    {/if}
  </Card.Header>
  <Card.Content class="svadmin-u-9335c39f6eff">
    {#if view.invalid}
      <p role="alert">{i18n.t('validation.invalidFormat')}</p>
    {:else if readUnavailable}
      <DataState
        state="error"
        title={i18n.t('common.configRequired')}
        description={i18n.t(dlq ? 'task.dlqUnavailable' : 'task.listUnavailable')}
      />
    {:else if useProviderData && query.isError}
      <DataState
        state="error"
        title={i18n.t('common.error')}
        description={i18n.t('task.fetchListFailed')}
        {...definedOptions({ retry: !canRead || query.isFetching ? undefined : retryRead })}
      />
    {:else if useProviderData && taskProvider && query.isLoading}
      <div class="svadmin-u-60fbb7713999 svadmin-u-aadad6871af8 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-bfa603190748">
        <Loader2 class="svadmin-u-d2347e8497a9 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" />
        {i18n.t('task.loadingList')}
      </div>
    {:else}
      <div class="svadmin-u-73fc3fb18ceb">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>{i18n.t('task.taskColumn')}</Table.Head>
              <Table.Head>{i18n.t('task.statusColumn')}</Table.Head>
              <Table.Head>{i18n.t('task.updatedColumn')}</Table.Head>
              {#if showActions}
                <Table.Head class="svadmin-u-308fc069e46e">{i18n.t('task.actionsColumn')}</Table.Head>
              {/if}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each keyedTasks as { task, key } (key)}
              <Table.Row class="svadmin-u-34516836730d svadmin-u-f6e31b39b8e4" onclick={(event) => selectRow(event, task)}>
                <Table.Cell class="svadmin-u-00cde2e9f1cf">
                  <div class="svadmin-u-da7c36cd8867">
                    {#if onSelect && !showActions}
                      <Button type="button" variant="ghost" size="sm" onclick={() => onSelect?.(task)}>
                        {resolveTaskTitle(task)}
                      </Button>
                    {:else}
                      <div class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{resolveTaskTitle(task)}</div>
                    {/if}
                    {#if resolveTaskMessage(task)}
                      <div class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{resolveTaskMessage(task)}</div>
                    {/if}
                    {#if showProgress && typeof resolveTaskProgress(task) === 'number'}
                      <TaskProgressBar {...definedOptions({ "value": resolveTaskProgress(task) })} />
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <TaskStatusBadge status={String(task.status ?? 'pending')} />
                </Table.Cell>
                <Table.Cell class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                  {formatTaskDate(resolveTaskUpdatedAt(task), i18n.locale)}
                </Table.Cell>
                {#if showActions}
                  <Table.Cell class="svadmin-u-308fc069e46e">
                    <div class="svadmin-u-60fbb7713999 svadmin-u-77c08e015d14 svadmin-u-77a2a20e90d4">
                      {#if taskProvider?.retry && canRetryTask(task)}
                        <RetryTaskButton taskId={task.id} {taskProvider} />
                      {/if}
                      {#if taskProvider?.cancel && canCancelTask(task)}
                        <CancelTaskButton taskId={task.id} {taskProvider} />
                      {/if}
                      {#if onSelect}
                        <Button type="button" variant="ghost" size="sm" onclick={() => onSelect?.(task)}>
                          {i18n.t('task.detailsAction')}
                        </Button>
                      {/if}
                    </div>
                  </Table.Cell>
                {/if}
              </Table.Row>
            {:else}
              <Table.Row>
                <Table.Cell colspan={showActions ? 4 : 3} class="svadmin-u-9678c61eaac3 svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">
                  {resolvedEmptyText}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
