<script lang="ts">
  import { definedReactiveOptions, definedOptions } from '@svadmin/core/options';

  import { ListTodo, Loader2, Plus, Search, RefreshCw } from '@lucide/svelte';
  import { getTaskProvider, useSubmitTask, useTaskList } from '@svadmin/core';
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
    taskProvider = getTaskProvider({ optional: true }) ?? undefined,
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

  const refreshInterval = $derived.by<number | false>(() =>
    autoRefresh === '0' ? false : Number(autoRefresh),
  );
  const resolvedTitle = $derived(title ?? i18n.t('task.drawerTitle'));

  const taskQuery = useTaskList(definedReactiveOptions({
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
  }));

  const dlqQuery = useTaskList(definedReactiveOptions({
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
  }));

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

  function formatTime(value: unknown) {
    if (typeof value !== 'string' || !value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
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
        const parsed: unknown = JSON.parse(submitBodyText);
        body = decodeTaskSubmitOptions({ body: parsed }).body;
      } catch {
        submitError = i18n.t('task.invalidJson');
        return;
      }
    }

    try {
      const handle = await submitTask.mutation.mutateAsync(definedOptions({
        taskName: submitTaskName.trim(),
        taskProvider,
        options: definedOptions({
          body,
          idempotencyKey: submitIdempotencyKey.trim() || undefined,
        }),
      }));
      activeTab = 'tasks';
      selectedTaskId = handle.id;
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
  class="svadmin-u-d89972fe17d6"
  onclick={() => open = !open}
  aria-label={resolvedTitle}
>
  <ListTodo class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
  {#if runningCount > 0}
    <span class="svadmin-u-da4dbfbc4fdc svadmin-u-2a95a5f480f7 svadmin-u-4c15f4f8c5ab svadmin-u-60fbb7713999 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-75b1bec3ea0e svadmin-u-1dc571a3609f svadmin-u-69450ef1487e svadmin-u-30ca335ae9c2">
      {runningCount}
    </span>
  {/if}
</Button>

<Sheet.Root
  bind:open
  side="right"
  class="svadmin-u-6da6a3c3f741 svadmin-u-1d4402dfae51 svadmin-u-d4f78465b34d svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8a539c7fe216"
  role="dialog"
  aria-modal="true"
  aria-labelledby="svadmin-task-queue-title"
  onClose={() => open = false}
>
  <Sheet.Content class="svadmin-u-668b21aa5409 svadmin-u-63a285be6490 svadmin-u-8a539c7fe216">
    <div class="svadmin-u-60fbb7713999 svadmin-u-668b21aa5409 svadmin-u-8dddea0773ed">
      <div class="svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-2859c861d7de svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12">
        <Sheet.Title id="svadmin-task-queue-title" class="svadmin-u-2daa8e5e2f2e">{resolvedTitle}</Sheet.Title>
        <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
          <ListTodo class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-bfa603190748" />
          <h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91">{resolvedTitle}</h2>
          <Badge variant="secondary" class="svadmin-u-359090c2d529">{i18n.t('task.activeCount', { count: runningCount })}</Badge>
          {#if allTasks[0] && resolveTaskCreatedAt(allTasks[0])}
            <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{i18n.t('task.lastQueuedAt', { time: formatTime(resolveTaskCreatedAt(allTasks[0])) })}</span>
          {/if}
        </div>
      </div>

      {#if !taskProvider}
        <div class="svadmin-u-60fbb7713999 svadmin-u-36e579c0b41c svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-0478c89a150f svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
          {i18n.t('common.configRequired')}
        </div>
      {:else}
        <div class="svadmin-u-f3c543ad5fe9 svadmin-u-fb7302e5364d svadmin-u-36e579c0b41c svadmin-u-63a285be6490 svadmin-u-bac517ea5f0f">
          <div class="svadmin-u-fb7302e5364d svadmin-u-73fc3fb18ceb svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-e2f2b4a69d35 svadmin-u-64a6e3fce6e0">
            <div class="svadmin-u-3e7ce58d64fa svadmin-u-8e63407b5ceb">
              <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c">
                <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
                  <Tabs.Root value={activeTab} class="svadmin-u-6da6a3c3f741">
                    <Tabs.List class="svadmin-u-52083e7da442 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-b00f43c30c2b svadmin-u-eb6a3cef9686">
                      <Tabs.Trigger value="tasks" active={activeTab === 'tasks'} onclick={() => activeTab = 'tasks'}>
                        {i18n.t('task.tabTasks')}
                        <Badge variant="outline" class="svadmin-u-f58b02572ab2 svadmin-u-1dc571a3609f">{taskQuery.data?.total ?? allTasks.length}</Badge>
                      </Tabs.Trigger>
                      <Tabs.Trigger value="dlq" active={activeTab === 'dlq'} onclick={() => activeTab = 'dlq'}>
                        {i18n.t('task.tabDlq')}
                        <Badge variant="outline" class="svadmin-u-f58b02572ab2 svadmin-u-1dc571a3609f">{dlqQuery.data?.total ?? dlqTasks.length}</Badge>
                      </Tabs.Trigger>
                    </Tabs.List>
                  </Tabs.Root>
                  <div class="svadmin-u-fb56d9cff341 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
                    <Button variant="outline" size="sm" onclick={() => void refreshCurrentTab()}>
                      <RefreshCw class="svadmin-u-82cc6c6581cd svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                      {i18n.t('common.refresh')}
                    </Button>
                    <Button size="sm" onclick={() => submitOpen = !submitOpen}>
                      <Plus class="svadmin-u-82cc6c6581cd svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                      {i18n.t('task.submitAction')}
                    </Button>
                  </div>
                </div>

                <div class="svadmin-u-f3c543ad5fe9 svadmin-u-1004c0c3954c svadmin-u-d05bf7110c88">
                  <div class="svadmin-u-d89972fe17d6">
                    <Search class="svadmin-u-a4326536b8f5 svadmin-u-da4dbfbc4fdc svadmin-u-22e59b722111 svadmin-u-d694ba66e322 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-36b381be4df3 svadmin-u-bfa603190748" />
                    <Input
                      class="svadmin-u-9e83b2412bc9"
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
                <Card.Root class="svadmin-u-05faf5c801ff svadmin-u-ad47d17e603c">
                  <Card.Header class="svadmin-u-7fcf9124b5df">
                    <Card.Title class="svadmin-u-4ee734926ff6">{i18n.t('task.submitTitle')}</Card.Title>
                    <Card.Description>{i18n.t('task.submitDescription')}</Card.Description>
                  </Card.Header>
                  <Card.Content class="svadmin-u-3e7ce58d64fa svadmin-u-9335c39f6eff">
                    <div class="svadmin-u-6f7e013d6499">
                      <Label for="task-name">{i18n.t('task.taskNameLabel')}</Label>
                      <Input id="task-name" bind:value={submitTaskName} placeholder="image.generate" />
                    </div>
                    <div class="svadmin-u-6f7e013d6499">
                      <Label for="task-idempotency-key">{i18n.t('task.idempotencyKeyLabel')}</Label>
                      <Input id="task-idempotency-key" bind:value={submitIdempotencyKey} placeholder="poster-2026-04-19" />
                    </div>
                    <div class="svadmin-u-6f7e013d6499">
                      <Label for="task-body">{i18n.t('task.bodyLabel')}</Label>
                      <Textarea id="task-body" bind:value={submitBodyText} class="svadmin-u-ee15a477cd9c svadmin-u-0e65706bcccd svadmin-u-359090c2d529" />
                    </div>
                    {#if submitError}
                      <p class="svadmin-u-fc7473ca09eb svadmin-u-811148b13d1e">{submitError}</p>
                    {/if}
                    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-77c08e015d14 svadmin-u-77a2a20e90d4">
                      <Button variant="ghost" onclick={() => { submitOpen = false; submitError = null; }}>
                        {i18n.t('common.cancel')}
                      </Button>
                      <Button onclick={() => void handleSubmitTask()} disabled={submitTask.mutation.isPending}>
                        {#if submitTask.mutation.isPending}
                          <Loader2 class="svadmin-u-82cc6c6581cd svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />
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

          <div class="svadmin-u-fb7302e5364d svadmin-u-73fc3fb18ceb svadmin-u-8a25a995eb8e">
            <div class="svadmin-u-8e63407b5ceb">
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
                <div class="svadmin-u-60fbb7713999 svadmin-u-668b21aa5409 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-a29b7a649c77 svadmin-u-05faf5c801ff svadmin-u-8417db9333ae svadmin-u-845f53365c8d svadmin-u-ca6bf63030aa svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
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
