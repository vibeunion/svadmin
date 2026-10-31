<script lang="ts">
  import { onDestroy } from 'svelte';
  import { definedReactiveOptions, definedOptions } from '@svadmin/core/options';

  import { ListTodo, Loader2, Plus, Search, RefreshCw } from '@lucide/svelte';
  import { captureAdminContext, captureAuthSession, TaskError, useSubmitTask, useTaskList } from '@svadmin/core';
  import { decodeTaskSubmitOptions } from '@svadmin/core/schema';
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
  import DataState from './content/DataState.svelte';
  import {
    isTaskActive,
    formatTaskDate,
    resolveTaskCreatedAt,
    resolveTaskMessage,
    resolveTaskTitle,
  } from './task-utils.js';

  const i18n = useTranslation();
  const context = captureAdminContext();

  type AutoRefreshValue = '0' | '5000' | '15000' | '30000';
  type TaskTab = 'tasks' | 'dlq';

  let {
    open = $bindable(false),
    taskProvider,
    title,
    initialTab = 'tasks',
  }: {
    open?: boolean;
    taskProvider?: TaskProvider<TaskRecord>;
    title?: string;
    initialTab?: TaskTab;
  } = $props();

  let activeTab = $derived(initialTab);
  let selectedTaskId = $state<string | null>(null);
  let searchQuery = $state('');
  let statusFilter = $state('all');
  let autoRefresh = $state<AutoRefreshValue>('15000');
  let submitTaskName = $state('');
  let submitIdempotencyKey = $state('');
  let submitBodyText = $state(i18n.t('task.bodyPlaceholder'));
  let submitError = $state<string | null>(null);
  let submitOpen = $state(false);
  let submitAttempt = $state.raw<object | null>(null);
  let mounted = true;
  onDestroy(() => { mounted = false; submitAttempt = null; });
  const activeTaskProvider = $derived(taskProvider ?? context.taskProvider);
  const canListTasks = $derived(typeof activeTaskProvider?.list === 'function');
  const canListDlq = $derived(typeof activeTaskProvider?.listDlq === 'function');
  const canListCurrentTab = $derived(activeTab === 'dlq' ? canListDlq : canListTasks);
  const taskScope = $derived({
    provider: activeTaskProvider,
    tenant: context.tenantCacheKey?.__svadminTenant,
    auth: context.authProvider,
    router: context.routerProvider,
    session: captureAuthSession(context.authProvider),
  });
  let previousTaskScope: typeof taskScope | undefined;
  function taskScopesEqual(left: typeof taskScope, right: typeof taskScope): boolean {
    return left.provider === right.provider
      && left.tenant === right.tenant
      && left.auth === right.auth
      && left.router === right.router
      && left.session.cacheKey === right.session.cacheKey
      && left.session.available === right.session.available;
  }
  function taskScopeIsCurrent(origin: typeof taskScope): boolean {
    return mounted && taskScopesEqual(origin, taskScope) && origin.session.isCurrent();
  }
  $effect.pre(() => {
    const scope = taskScope;
    if (previousTaskScope && !taskScopesEqual(previousTaskScope, scope)) {
      selectedTaskId = null;
      submitAttempt = null;
      submitOpen = false;
      resetSubmitForm();
    }
    previousTaskScope = scope;
  });
  $effect.pre(() => {
    if (!open) {
      submitAttempt = null;
      submitOpen = false;
    }
  });

  const refreshInterval = $derived.by<number | false>(() =>
    autoRefresh === '0' ? false : Number(autoRefresh),
  );
  const resolvedTitle = $derived(title ?? i18n.t('task.drawerTitle'));

  const taskQuery = useTaskList(definedReactiveOptions({
    errorNotification: false,
    get taskProvider() {
      return activeTaskProvider;
    },
    get queryOptions() {
      return {
        enabled: canListTasks,
        refetchInterval: refreshInterval,
        refetchIntervalInBackground: true,
      };
    },
  }));

  const dlqQuery = useTaskList(definedReactiveOptions({
    errorNotification: false,
    get dlq() {
      return true;
    },
    get taskProvider() {
      return activeTaskProvider;
    },
    get queryOptions() {
      return {
        enabled: canListDlq,
        refetchInterval: refreshInterval,
        refetchIntervalInBackground: true,
      };
    },
  }));

  const submitTask = useSubmitTask();

  const allTasks = $derived(canListTasks ? taskQuery.data?.data ?? [] : []);
  const dlqTasks = $derived(canListDlq ? dlqQuery.data?.data ?? [] : []);
  const currentQuery = $derived(activeTab === 'dlq' ? dlqQuery : taskQuery);

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
      selectedTaskId = current[0]?.id ?? null;
      return;
    }

    if (!current.some((task) => task.id === selectedTaskId)) {
      selectedTaskId = current[0]?.id ?? null;
    }
  });


  function resetSubmitForm() {
    submitTaskName = '';
    submitIdempotencyKey = '';
    submitBodyText = i18n.t('task.bodyPlaceholder');
    submitError = null;
  }

  function toggleSubmitForm(): void {
    submitAttempt = null;
    submitError = null;
    submitOpen = !submitOpen;
  }

  async function handleSubmitTask() {
    if (!open || !submitOpen || submitAttempt || !activeTaskProvider || !taskScope.session.available) return;
    submitError = null;
    if (!submitTaskName.trim()) {
      submitError = i18n.t('validation.required');
      return;
    }

    let body: Record<string, unknown> | undefined;
    if (submitBodyText.trim()) {
      try {
        const parsed: unknown = JSON.parse(submitBodyText);
        body = decodeTaskSubmitOptions({ body: parsed }).body;
      } catch {
        submitError = i18n.t('task.invalidJson');
        return;
      }
    }

    const origin = taskScope;
    const attempt = {};
    submitAttempt = attempt;
    const current = () => submitAttempt === attempt && taskScopeIsCurrent(origin);
    try {
      const handle = await submitTask.mutation.mutateAsync(definedOptions({
        taskName: submitTaskName.trim(),
        taskProvider: activeTaskProvider,
        options: definedOptions({
          body,
          idempotencyKey: submitIdempotencyKey.trim() || undefined,
        }),
      }));
      if (!current()) return;
      activeTab = 'tasks';
      selectedTaskId = handle.id;
      submitOpen = false;
      resetSubmitForm();
      await Promise.allSettled([
        ...(canListTasks ? [taskQuery.refetch?.()] : []),
        ...(canListDlq ? [dlqQuery.refetch?.()] : []),
      ]);
    } catch (error) {
      if (!current()) return;
      submitError = error instanceof TaskError && error.writeMayHaveSucceeded
        ? i18n.t('task.submitUnconfirmed')
        : i18n.t('task.submitFailed');
    } finally {
      if (submitAttempt === attempt) submitAttempt = null;
    }
  }

  async function refreshCurrentTab() {
    if (!canListCurrentTab || currentQuery.isFetching) return;
    if (activeTab === 'dlq') {
      await dlqQuery.refetch?.({ cancelRefetch: false });
      return;
    }
    await taskQuery.refetch?.({ cancelRefetch: false });
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
          {#if canListTasks}
            <Badge variant="secondary" class="text-xs">{i18n.t('task.activeCount', { count: runningCount })}</Badge>
          {/if}
          {#if allTasks[0] && resolveTaskCreatedAt(allTasks[0])}
            <span class="text-xs text-muted-foreground">{i18n.t('task.lastQueuedAt', { time: formatTaskDate(resolveTaskCreatedAt(allTasks[0]), i18n.locale) })}</span>
          {/if}
        </div>
      </div>

      {#if !activeTaskProvider}
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
                        {#if canListTasks}
                          <Badge variant="outline" class="ml-1 text-[10px]">{taskQuery.data?.total ?? allTasks.length}</Badge>
                        {/if}
                      </Tabs.Trigger>
                      <Tabs.Trigger value="dlq" active={activeTab === 'dlq'} onclick={() => activeTab = 'dlq'}>
                        {i18n.t('task.tabDlq')}
                        {#if canListDlq}
                          <Badge variant="outline" class="ml-1 text-[10px]">{dlqQuery.data?.total ?? dlqTasks.length}</Badge>
                        {/if}
                      </Tabs.Trigger>
                    </Tabs.List>
                  </Tabs.Root>
                  <div class="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={!canListCurrentTab || currentQuery.isFetching} onclick={() => void refreshCurrentTab()}>
                      <RefreshCw class="mr-1.5 h-3.5 w-3.5" />
                      {i18n.t('common.refresh')}
                    </Button>
                    <Button size="sm" disabled={!taskScope.session.available} onclick={toggleSubmitForm}>
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
                      disabled={!canListCurrentTab}
                      bind:value={searchQuery}
                    />
                  </div>
                  <Select bind:value={statusFilter} disabled={!canListCurrentTab} aria-label={i18n.t('task.statusFilterLabel')}>
                    <option value="all">{i18n.t('task.statusAll')}</option>
                    {#each availableStatuses as status, _i (_i)}
                      <option value={status}>{status}</option>
                    {/each}
                  </Select>
                  <Select bind:value={autoRefresh} disabled={!canListCurrentTab} aria-label={i18n.t('task.autoRefreshLabel')}>
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
                      <p role="alert" class="text-sm text-destructive">{submitError}</p>
                    {/if}
                    <div class="flex flex-wrap justify-end gap-2">
                      <Button variant="ghost" onclick={toggleSubmitForm}>
                        {i18n.t('common.cancel')}
                      </Button>
                      <Button onclick={() => void handleSubmitTask()} disabled={submitAttempt !== null || !taskScope.session.available}>
                        {#if submitAttempt !== null}
                          <Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        {/if}
                        {i18n.t('task.submitAction')}
                      </Button>
                    </div>
                  </Card.Content>
                </Card.Root>
              {/if}

              {#if !canListCurrentTab}
                <DataState state="error" title={i18n.t('common.configRequired')}
                  description={i18n.t(activeTab === 'dlq' ? 'task.dlqUnavailable' : 'task.listUnavailable')} />
              {:else if currentQuery.isError}
                <DataState state="error" description={i18n.t('task.fetchListFailed')}
                  {...definedOptions({ retry: currentQuery.isFetching ? undefined : () => { void refreshCurrentTab(); } })} />
              {:else if currentQuery.isLoading}
                <DataState state="loading" loadingLabel={i18n.t('task.loadingList')} />
              {:else}
                <TaskList
                  tasks={filteredTasks}
                  taskProvider={activeTaskProvider}
                  dlq={activeTab === 'dlq'}
                  title={activeTab === 'dlq' ? i18n.t('task.dlqTitle') : i18n.t('task.listTitle')}
                  emptyText={activeTab === 'dlq' ? i18n.t('task.noDlq') : i18n.t('task.noTasks')}
                  onSelect={(task) => {
                    selectedTaskId = task.id;
                  }}
                />
              {/if}
            </div>
          </div>

          <div class="min-h-0 overflow-auto bg-muted/10">
            <div class="p-4">
              {#if canListCurrentTab && selectedTaskId && !currentQuery.isError && !currentQuery.isLoading}
                <TaskDetails
                  taskId={selectedTaskId}
                  taskProvider={activeTaskProvider}
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
