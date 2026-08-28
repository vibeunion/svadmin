<script lang="ts">
  import { ListTodo, Loader2, Plus, Search, RefreshCw } from '@lucide/svelte';
  import { getTaskProvider, useSubmitTask, useTaskList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { TaskProvider, TaskRecord } from '@svadmin/core';
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Input } from './ui/input/index.js';
  import { Select } from './ui/select/index.js';
  import { Textarea } from './ui/textarea/index.js';
  import { Label } from './ui/label/index.js';
  import * as Sheet from './ui/sheet/index.js';
  import * as Tabs from './ui/tabs/index.js';
  import * as Card from './ui/card/index.js';
  import TaskList from './TaskList.svelte';
  import TaskDetails from './TaskDetails.svelte';
  import {
    isTaskActive,
    resolveTaskCreatedAt,
    resolveTaskMessage,
    resolveTaskTitle,
  } from './task-utils.js';

  const i18n = useTranslation();

  type AutoRefreshValue = '0' | '5000' | '15000' | '30000';
  type TaskTab = 'tasks' | 'dlq';

  let {
    open = $bindable(false),
    taskProvider = getTaskProvider({ optional: true }) as TaskProvider<TaskRecord> | undefined,
    title,
    initialTab = 'tasks',
  }: {
    open?: boolean;
    taskProvider?: TaskProvider<TaskRecord>;
    title?: string;
    initialTab?: TaskTab;
  } = $props();

    // eslint-disable-next-line svelte/prefer-writable-derived
  let activeTab = $state<TaskTab>('tasks');
  let selectedTaskId = $state<string | null>(null);
  let searchQuery = $state('');
  let statusFilter = $state('all');
  let autoRefresh = $state<AutoRefreshValue>('15000');
  let submitTaskName = $state('');
  let submitIdempotencyKey = $state('');
  let submitBodyText = $state(i18n.t('task.bodyPlaceholder'));
  let submitError = $state<string | null>(null);
  let submitOpen = $state(false);

  const refreshInterval = $derived.by<number | false>(() =>
    autoRefresh === '0' ? false : Number(autoRefresh),
  );
  const resolvedTitle = $derived(title ?? i18n.t('task.drawerTitle'));

  const taskQuery = useTaskList({
    get taskProvider() {
      return taskProvider;
    },
    get queryOptions() {
      return {
        enabled: !!taskProvider,
        refetchInterval: refreshInterval,
        refetchIntervalInBackground: true,
      };
    },
  });

  const dlqQuery = useTaskList({
    get dlq() {
      return true;
    },
    get taskProvider() {
      return taskProvider;
    },
    get queryOptions() {
      return {
        enabled: !!taskProvider && !!taskProvider?.listDlq,
        refetchInterval: refreshInterval,
        refetchIntervalInBackground: true,
      };
    },
  });

  const submitTask = useSubmitTask();

  const allTasks = $derived(taskQuery.data?.data ?? []);
  const dlqTasks = $derived(dlqQuery.data?.data ?? []);

  const availableStatuses = $derived.by(() => {
    const source = activeTab === 'dlq' ? dlqTasks : allTasks;
    const unique = Array.from(new Set(source.map((task) => String(task.status ?? 'pending').toLowerCase()).filter(Boolean)));
    return unique.sort();
  });

  function matchesSearch(task: TaskRecord, query: string) {
    if (!query) return true;
    const haystack = [
      task.id,
      resolveTaskTitle(task),
      task.status,
      resolveTaskMessage(task),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function matchesStatus(task: TaskRecord, status: string) {
    if (status === 'all') return true;
    return String(task.status ?? 'pending').toLowerCase() === status;
  }

  const filteredTasks = $derived.by(() => {
    const source = activeTab === 'dlq' ? dlqTasks : allTasks;
    return source.filter((task) => matchesSearch(task, searchQuery) && matchesStatus(task, statusFilter));
  });

  const runningCount = $derived(
    allTasks.filter(isTaskActive).length,
  );

  $effect(() => {
    activeTab = initialTab;
  });

  $effect(() => {
    if (statusFilter !== 'all' && !availableStatuses.includes(statusFilter)) {
      statusFilter = 'all';
    }
  });

  $effect(() => {
    const current = filteredTasks;
    if (current.length === 0) {
      selectedTaskId = null;
      return;
    }

    if (!selectedTaskId) {
      selectedTaskId = current[0].id;
      return;
    }

    if (!current.some((task) => task.id === selectedTaskId)) {
      selectedTaskId = current[0].id;
    }
  });

  function formatTime(value: unknown) {
    if (!value) return '—';
    const date = new Date(value as string | Date);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function resetSubmitForm() {
    submitTaskName = '';
    submitIdempotencyKey = '';
    submitBodyText = i18n.t('task.bodyPlaceholder');
    submitError = null;
  }

  async function handleSubmitTask() {
    submitError = null;
    if (!submitTaskName.trim()) {
      submitError = i18n.t('validation.required');
      return;
    }

    let body: Record<string, unknown> | undefined;
    if (submitBodyText.trim()) {
      try {
        body = JSON.parse(submitBodyText) as Record<string, unknown>;
      } catch {
        submitError = i18n.t('task.invalidJson');
        return;
      }
    }

    try {
      const handle = await submitTask.mutation.mutateAsync({
        taskName: submitTaskName.trim(),
        taskProvider,
        options: {
          body,
          idempotencyKey: submitIdempotencyKey.trim() || undefined,
        },
      });
      activeTab = 'tasks';
      selectedTaskId = handle.id ?? null;
      submitOpen = false;
      resetSubmitForm();
      await Promise.all([
        taskQuery.refetch?.(),
        dlqQuery.refetch?.(),
      ]);
    } catch (error) {
      submitError = error instanceof Error ? error.message : i18n.t('task.submitFailed');
    }
  }

  async function refreshCurrentTab() {
    if (activeTab === 'dlq') {
      await dlqQuery.refetch?.();
      return;
    }
    await taskQuery.refetch?.();
  }
</script>

<Button
  variant="ghost"
  size="icon"
  class="relative"
  onclick={() => open = !open}
  aria-label={resolvedTitle}
>
  <ListTodo class="h-4 w-4" />
  {#if runningCount > 0}
    <span class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
      {runningCount}
    </span>
  {/if}
</Button>

<Sheet.Root
  bind:open
  side="right"
  class="w-full max-w-6xl border-l border-border bg-card p-0"
  role="dialog"
  aria-modal="true"
  aria-labelledby="svadmin-task-queue-title"
  onClose={() => open = false}
>
  <Sheet.Content class="h-full gap-0 p-0">
    <div class="flex h-full flex-col">
      <div class="border-b border-border bg-muted/30 px-4 py-3">
        <Sheet.Title id="svadmin-task-queue-title" class="sr-only">{resolvedTitle}</Sheet.Title>
        <div class="flex flex-wrap items-center gap-2">
          <ListTodo class="h-5 w-5 text-muted-foreground" />
          <h2 class="text-sm font-semibold">{resolvedTitle}</h2>
          <Badge variant="secondary" class="text-xs">{i18n.t('task.activeCount', { count: runningCount })}</Badge>
          {#if allTasks[0] && resolveTaskCreatedAt(allTasks[0])}
            <span class="text-xs text-muted-foreground">{i18n.t('task.lastQueuedAt', { time: formatTime(resolveTaskCreatedAt(allTasks[0])) })}</span>
          {/if}
        </div>
      </div>

      {#if !taskProvider}
        <div class="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          {i18n.t('common.configRequired')}
        </div>
      {:else}
        <div class="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div class="min-h-0 overflow-auto border-b border-border lg:border-b-0 lg:border-r">
            <div class="space-y-4 p-4">
              <div class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center gap-2">
                  <Tabs.Root value={activeTab} class="w-full">
                    <Tabs.List class="inline-flex rounded-lg border border-border bg-muted/40 p-1">
                      <Tabs.Trigger value="tasks" active={activeTab === 'tasks'} onclick={() => activeTab = 'tasks'}>
                        {i18n.t('task.tabTasks')}
                        <Badge variant="outline" class="ml-1 text-[10px]">{taskQuery.data?.total ?? allTasks.length}</Badge>
                      </Tabs.Trigger>
                      <Tabs.Trigger value="dlq" active={activeTab === 'dlq'} onclick={() => activeTab = 'dlq'}>
                        {i18n.t('task.tabDlq')}
                        <Badge variant="outline" class="ml-1 text-[10px]">{dlqQuery.data?.total ?? dlqTasks.length}</Badge>
                      </Tabs.Trigger>
                    </Tabs.List>
                  </Tabs.Root>
                  <div class="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" onclick={() => void refreshCurrentTab()}>
                      <RefreshCw class="mr-1.5 h-3.5 w-3.5" />
                      {i18n.t('common.refresh')}
                    </Button>
                    <Button size="sm" onclick={() => submitOpen = !submitOpen}>
                      <Plus class="mr-1.5 h-3.5 w-3.5" />
                      {i18n.t('task.submitAction')}
                    </Button>
                  </div>
                </div>

                <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
                  <div class="relative">
                    <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      class="pl-9"
                      placeholder={i18n.t('task.searchPlaceholder')}
                      bind:value={searchQuery}
                    />
                  </div>
                  <Select bind:value={statusFilter} aria-label={i18n.t('task.statusFilterLabel')}>
                    <option value="all">{i18n.t('task.statusAll')}</option>
                    {#each availableStatuses as status, _i (_i)}
                      <option value={status}>{status}</option>
                    {/each}
                  </Select>
                  <Select bind:value={autoRefresh} aria-label={i18n.t('task.autoRefreshLabel')}>
                    <option value="0">{i18n.t('task.refreshOff')}</option>
                    <option value="5000">{i18n.t('task.refresh5s')}</option>
                    <option value="15000">{i18n.t('task.refresh15s')}</option>
                    <option value="30000">{i18n.t('task.refresh30s')}</option>
                  </Select>
                </div>
              </div>

              {#if submitOpen}
                <Card.Root class="border-border/60 shadow-none">
                  <Card.Header class="pb-3">
                    <Card.Title class="text-base">{i18n.t('task.submitTitle')}</Card.Title>
                    <Card.Description>{i18n.t('task.submitDescription')}</Card.Description>
                  </Card.Header>
                  <Card.Content class="space-y-4 pt-0">
                    <div class="space-y-2">
                      <Label for="task-name">{i18n.t('task.taskNameLabel')}</Label>
                      <Input id="task-name" bind:value={submitTaskName} placeholder="image.generate" />
                    </div>
                    <div class="space-y-2">
                      <Label for="task-idempotency-key">{i18n.t('task.idempotencyKeyLabel')}</Label>
                      <Input id="task-idempotency-key" bind:value={submitIdempotencyKey} placeholder="poster-2026-04-19" />
                    </div>
                    <div class="space-y-2">
                      <Label for="task-body">{i18n.t('task.bodyLabel')}</Label>
                      <Textarea id="task-body" bind:value={submitBodyText} class="min-h-[140px] font-mono text-xs" />
                    </div>
                    {#if submitError}
                      <p class="text-sm text-destructive">{submitError}</p>
                    {/if}
                    <div class="flex flex-wrap justify-end gap-2">
                      <Button variant="ghost" onclick={() => { submitOpen = false; submitError = null; }}>
                        {i18n.t('common.cancel')}
                      </Button>
                      <Button onclick={() => void handleSubmitTask()} disabled={submitTask.mutation.isPending}>
                        {#if submitTask.mutation.isPending}
                          <Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        {/if}
                        {i18n.t('task.submitAction')}
                      </Button>
                    </div>
                  </Card.Content>
                </Card.Root>
              {/if}

              <TaskList
                tasks={filteredTasks}
                {taskProvider}
                dlq={activeTab === 'dlq'}
                title={activeTab === 'dlq' ? i18n.t('task.dlqTitle') : i18n.t('task.listTitle')}
                emptyText={activeTab === 'dlq' ? i18n.t('task.noDlq') : i18n.t('task.noTasks')}
                onSelect={(task) => {
                  selectedTaskId = task.id;
                }}
              />
            </div>
          </div>

          <div class="min-h-0 overflow-auto bg-muted/10">
            <div class="p-4">
              {#if selectedTaskId}
                <TaskDetails
                  taskId={selectedTaskId}
                  {taskProvider}
                  useProviderData
                  queryOptions={{
                    refetchInterval: refreshInterval,
                    refetchIntervalInBackground: true,
                  }}
                />
              {:else}
                <div class="flex h-full items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/70 p-8 text-center text-sm text-muted-foreground">
                  {i18n.t('task.selectHint')}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
