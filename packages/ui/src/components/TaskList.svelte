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

<Card.Root class="border-border/40 shadow-sm">
  <Card.Header class="pb-3">
    <Card.Title class="text-base">{resolvedTitle}</Card.Title>
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
  <Card.Content class="pt-0">
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
      <div class="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {i18n.t('task.loadingList')}
      </div>
    {:else}
      <div class="overflow-auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>{i18n.t('task.taskColumn')}</Table.Head>
              <Table.Head>{i18n.t('task.statusColumn')}</Table.Head>
              <Table.Head>{i18n.t('task.updatedColumn')}</Table.Head>
              {#if showActions}
                <Table.Head class="text-right">{i18n.t('task.actionsColumn')}</Table.Head>
              {/if}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each keyedTasks as { task, key } (key)}
              <Table.Row class="cursor-pointer hover:bg-muted/40" onclick={(event) => selectRow(event, task)}>
                <Table.Cell class="min-w-[240px]">
                  <div class="space-y-1">
                    {#if onSelect && !showActions}
                      <Button type="button" variant="ghost" size="sm" onclick={() => onSelect?.(task)}>
                        {resolveTaskTitle(task)}
                      </Button>
                    {:else}
                      <div class="font-medium text-foreground">{resolveTaskTitle(task)}</div>
                    {/if}
                    {#if resolveTaskMessage(task)}
                      <div class="text-xs text-muted-foreground">{resolveTaskMessage(task)}</div>
                    {/if}
                    {#if showProgress && typeof resolveTaskProgress(task) === 'number'}
                      <TaskProgressBar {...definedOptions({ "value": resolveTaskProgress(task) })} />
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <TaskStatusBadge status={String(task.status ?? 'pending')} />
                </Table.Cell>
                <Table.Cell class="text-xs text-muted-foreground">
                  {formatTaskDate(resolveTaskUpdatedAt(task), i18n.locale)}
                </Table.Cell>
                {#if showActions}
                  <Table.Cell class="text-right">
                    <div class="flex justify-end gap-2">
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
                <Table.Cell colspan={showActions ? 4 : 3} class="h-24 text-center text-muted-foreground">
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
