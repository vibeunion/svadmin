<script lang="ts">
  import { useList } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge, Button, ContentPageHeader, ContentPageShell, MetricBlock } from '@svadmin/ui';
  import * as Card from '@svadmin/ui/components/ui/card/index.js';
  import { Bot, CalendarDays, CheckCircle2, Circle, Flag, ListTodo, Tag } from '@lucide/svelte';
  import { readHashView } from '../utils/hashView';

  const i18n = useTranslation();

  interface Todo {
    id: number;
    title: string;
    priority: string;
    status: string;
    dueDate: string;
    completed: boolean;
    notes: string;
  }

  let { resourceName = 'todos' } = $props<{ resourceName?: string }>();
  let activeView = $state(readHashView('all'));
  let statusOverrides = $state<Record<number, string>>({});
  let draggedTodoId = $state<number | null>(null);

  const locale = $derived(i18n.locale);
  const isZh = $derived(locale === 'zh-CN');
  const query = useList({ resource: 'todos', pagination: { mode: 'off' }, sorters: [{ field: 'dueDate', order: 'asc' }] });
  const todos = $derived((query.data?.data ?? []) as unknown as Todo[]);
  const boardTodos = $derived(todos.map((todo) => {
    const hasOverride = Object.hasOwn(statusOverrides, todo.id);
    const status = hasOverride ? statusOverrides[todo.id] : todo.status;
    return { ...todo, status, completed: hasOverride ? status === 'done' : status === 'done' || todo.completed };
  }));
  const lanes = $derived([
    { key: 'open', title: isZh ? '待开始' : 'Open' },
    { key: 'in_progress', title: isZh ? '进行中' : 'In Progress' },
    { key: 'blocked', title: isZh ? '阻塞' : 'Blocked' },
    { key: 'done', title: isZh ? '已完成' : 'Done' },
  ]);
  const completedCount = $derived(boardTodos.filter((todo) => todo.completed).length);
  const highPriorityCount = $derived(boardTodos.filter((todo) => todo.priority === 'high').length);
  const progress = $derived(boardTodos.length ? Math.round(completedCount / boardTodos.length * 100) : 0);
  const priorityGroups = $derived(['high', 'medium', 'low'].map((priority) => ({
    priority,
    count: boardTodos.filter((todo) => todo.priority === priority).length,
  })));
  const todayTasks = $derived(boardTodos.filter((todo) => todo.dueDate <= '2026-06-14' && !todo.completed).length);
  const upcomingTasks = $derived(boardTodos.filter((todo) => todo.dueDate > '2026-06-14' && !todo.completed).length);
  const taskLists = $derived([
    { key: 'all', label: isZh ? '全部任务 / All Tasks' : 'All Tasks', count: boardTodos.length, href: '#/todos', Icon: ListTodo },
    { key: 'today', label: isZh ? '今日' : 'Today', count: todayTasks, href: '#/todos?view=today', Icon: CalendarDays },
    { key: 'upcoming', label: isZh ? '即将到来' : 'Upcoming', count: upcomingTasks, href: '#/todos?view=upcoming', Icon: CalendarDays },
    { key: 'priority', label: isZh ? '优先级' : 'Priority', count: highPriorityCount, href: '#/todos?view=priority', Icon: Flag },
    { key: 'completed', label: isZh ? '已完成' : 'Completed', count: completedCount, href: '#/todos?view=completed', Icon: CheckCircle2 },
  ]);
  const tags = $derived([
    { label: isZh ? '工作' : 'Work', count: boardTodos.length },
    { label: isZh ? '个人' : 'Personal', count: 1 },
    { label: isZh ? '团队' : 'Team', count: usersFallback(boardTodos.length) },
    { label: isZh ? '目标' : 'Goals', count: highPriorityCount },
  ]);
  const normalizedView = $derived(['today', 'upcoming', 'priority', 'completed', 'tags'].includes(activeView) ? activeView : 'all');
  const viewCopy = $derived.by(() => {
    const copies = {
      all: {
        badge: isZh ? '全部任务 / All Tasks' : 'All Tasks',
        title: isZh ? '每日执行进度' : 'Daily Execution Progress',
        description: isZh ? '汇总所有任务、优先级和阻塞状态，适合班前会快速巡检。' : 'Summarize all tasks, priorities, and blockers for a fast standup review.',
        helper: isZh ? '跨清单复盘' : 'cross-list review',
      },
      today: {
        badge: isZh ? '今日' : 'Today',
        title: isZh ? '今日作业清单' : 'Today Work Queue',
        description: isZh ? '聚焦今天必须完成的库存、到货和协作事项。' : 'Focus on inventory, receiving, and collaboration items due today.',
        helper: isZh ? '当天闭环' : 'same-day closure',
      },
      upcoming: {
        badge: isZh ? '即将到来' : 'Upcoming',
        title: isZh ? '未来排期' : 'Upcoming Schedule',
        description: isZh ? '提前检查未来任务，避免补货和交付窗口临时拥堵。' : 'Review future work before replenishment and delivery windows become crowded.',
        helper: isZh ? '计划预警' : 'planning signal',
      },
      priority: {
        badge: isZh ? '优先级' : 'Priority',
        title: isZh ? '高优先级处理' : 'Priority Triage',
        description: isZh ? '把高风险、高影响任务放在最前面处理。' : 'Bring high-risk and high-impact tasks to the top of the queue.',
        helper: isZh ? '风险优先' : 'risk first',
      },
      completed: {
        badge: isZh ? '已完成' : 'Completed',
        title: isZh ? '完成复盘' : 'Completion Review',
        description: isZh ? '查看已关闭事项，用于班后复盘和操作留痕。' : 'Review closed work for end-of-day recap and operational traceability.',
        helper: isZh ? '闭环证据' : 'closure evidence',
      },
      tags: {
        badge: isZh ? '标签' : 'Tags',
        title: isZh ? '标签工作台' : 'Tag Workspace',
        description: isZh ? '按工作、个人、团队和目标标签组织待办上下文。' : 'Organize todo context by work, personal, team, and goal tags.',
        helper: isZh ? '上下文整理' : 'context sorting',
      },
    } satisfies Record<string, { badge: string; title: string; description: string; helper: string }>;
    return copies[normalizedView as keyof typeof copies];
  });
  const focusedTodos = $derived.by(() => {
    if (normalizedView === 'today') return boardTodos.filter((todo) => todo.dueDate <= '2026-06-14' && !todo.completed);
    if (normalizedView === 'upcoming') return boardTodos.filter((todo) => todo.dueDate > '2026-06-14' && !todo.completed);
    if (normalizedView === 'priority') return boardTodos.filter((todo) => todo.priority === 'high');
    if (normalizedView === 'completed') return boardTodos.filter((todo) => todo.completed);
    return boardTodos;
  });

  function usersFallback(count: number): number {
    return Math.max(1, count - 1);
  }

  function syncView(): void {
    activeView = readHashView('all');
  }

  function priorityLabel(priority: string): string {
    if (!isZh) return priority;
    if (priority === 'high') return '高';
    if (priority === 'medium') return '中';
    if (priority === 'low') return '低';
    return priority;
  }

  function moveTodo(todoId: number, status: string): void {
    statusOverrides = { ...statusOverrides, [todoId]: status };
  }

  function nextStatus(status: string): string {
    if (status === 'open') return 'in_progress';
    if (status === 'in_progress') return 'done';
    if (status === 'blocked') return 'in_progress';
    return 'done';
  }

  function laneTodos(status: string): Todo[] {
    return boardTodos.filter((todo) => todo.status === status || (status === 'done' && todo.completed));
  }
</script>

<svelte:window onhashchange={syncView} onpopstate={syncView} />

{#snippet headerActions()}
  <Button size="sm">{isZh ? '新建任务' : 'New task'}</Button>
{/snippet}

<div data-app-page="todo-workspace" data-todo-view={normalizedView} data-resource-name={resourceName}>
<ContentPageShell pageId="todo-workspace" width="wide">
  <ContentPageHeader eyebrow={viewCopy.badge} title={viewCopy.title} description={viewCopy.description} actions={headerActions} />
  <section class="grid gap-3 sm:grid-cols-3">
    <MetricBlock label={isZh ? '完成进度' : 'Progress'} value={`${progress}%`} detail={`${completedCount}/${boardTodos.length} ${isZh ? '已完成' : 'completed'}`} trendTone={progress >= 70 ? 'positive' : 'warning'} />
    <MetricBlock label={isZh ? '高优先级' : 'High priority'} value={highPriorityCount} detail={isZh ? '需要当天处理' : 'Need same-day attention'} trendTone={highPriorityCount > 0 ? 'warning' : 'positive'} />
    <MetricBlock label={isZh ? '优先级分布' : 'Priority mix'} value={priorityGroups.map((group) => `${priorityLabel(group.priority)} ${group.count}`).join(' · ')} />
  </section>

  <section class="grid gap-4 xl:grid-cols-[0.72fr_1.28fr_0.72fr]">
    <Card.Root>
      <Card.Header class="border-b">
        <Card.Title class="flex items-center gap-2 text-base"><ListTodo class="h-5 w-5 text-primary" />{isZh ? '待办列表' : 'Todo Lists'}</Card.Title>
        <Card.Description>{isZh ? '按清单、标签和优先级组织每日作业。' : 'Organize daily work by list, tag, and priority.'}</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-2 p-3">
        {#each taskLists as list (list.key)}
          <a href={list.href} class={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${normalizedView === list.key ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/45'}`}>
            <span class="flex items-center gap-2"><list.Icon class="h-4 w-4 text-muted-foreground" />{list.label}</span>
            <Badge variant="outline">{list.count}</Badge>
          </a>
        {/each}
        <div class="my-3 border-t"></div>
        <p class="px-3 text-xs font-semibold text-muted-foreground">{isZh ? '标签' : 'Tags'}</p>
        {#each tags as tag (tag.label)}
          <a href="#/todos?view=tags" class={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${normalizedView === 'tags' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/45'}`}>
            <span class="flex items-center gap-2"><Tag class="h-4 w-4 text-muted-foreground" />{tag.label}</span>
            <Badge variant="outline">{tag.count}</Badge>
          </a>
        {/each}
      </Card.Content>
    </Card.Root>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {#each lanes as lane (lane.key)}
        <Card.Root class="overflow-hidden">
          <Card.Header class="border-b px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <Card.Title class="text-sm">{lane.title}</Card.Title>
              <Badge variant="outline">{laneTodos(lane.key).length}</Badge>
            </div>
          </Card.Header>
          <Card.Content
            class={`min-h-48 space-y-3 p-3 transition ${draggedTodoId ? 'bg-primary/5' : ''}`}
            ondragover={(event) => event.preventDefault()}
            ondrop={(event) => {
              event.preventDefault();
              if (draggedTodoId) moveTodo(draggedTodoId, lane.key);
              draggedTodoId = null;
            }}
          >
            {#each laneTodos(lane.key) as todo (todo.id)}
              <article
                class="rounded-lg border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                draggable="true"
                ondragstart={() => draggedTodoId = todo.id}
                ondragend={() => draggedTodoId = null}
              >
                <div class="flex items-start gap-2">
                  <button
                    class="mt-0.5 rounded-full outline-none focus:ring-2 focus:ring-primary/25"
                    aria-label={todo.completed ? (isZh ? '重新打开任务' : 'Reopen task') : (isZh ? '完成任务' : 'Complete task')}
                    onclick={() => moveTodo(todo.id, todo.completed ? 'open' : 'done')}
                  >
                    {#if todo.completed}<CheckCircle2 class="h-4 w-4 text-success" />{:else}<Circle class="h-4 w-4 text-muted-foreground" />{/if}
                  </button>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold">{todo.title}</p>
                    <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{todo.notes}</p>
                    <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline">{priorityLabel(todo.priority)}</Badge>
                      <span class="text-xs text-primary">{todo.dueDate}</span>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      {#if todo.status !== 'done'}
                        <Button size="sm" variant="outline" onclick={() => moveTodo(todo.id, nextStatus(todo.status))}>{isZh ? '推进' : 'Move next'}</Button>
                      {/if}
                      {#if todo.status !== 'blocked' && todo.status !== 'done'}
                        <Button size="sm" variant="outline" onclick={() => moveTodo(todo.id, 'blocked')}>{isZh ? '标记阻塞' : 'Block'}</Button>
                      {/if}
                    </div>
                  </div>
                </div>
              </article>
            {:else}
              <div class="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                {isZh ? '拖动任务到这里' : 'Drop tasks here'}
              </div>
            {/each}
          </Card.Content>
        </Card.Root>
      {/each}
    </div>

    <Card.Root class="overflow-hidden border-primary/20">
      <Card.Header class="border-b"><Card.Title class="flex items-center gap-2 text-base"><Bot class="h-5 w-5 text-primary" />{isZh ? '任务助手' : 'Task Assistant'}</Card.Title></Card.Header>
      <Card.Content class="space-y-4 p-4">
        <div class="rounded-lg border bg-background p-4">
          <p class="text-xs font-semibold text-muted-foreground">{isZh ? '专注进度' : 'Focus progress'}</p>
          <div class="mt-3 flex items-end justify-between gap-3">
            <p class="text-2xl font-semibold">{completedCount} / {boardTodos.length}</p>
            <Badge variant="outline">{isZh ? '今日节奏' : 'today pace'}</Badge>
          </div>
          <div class="mt-3 h-2 rounded-full bg-muted"><div class="h-2 rounded-full bg-primary" style:width={`${progress}%`}></div></div>
        </div>
        <p class="rounded-lg rounded-tl-sm border bg-muted/25 p-4 text-sm text-muted-foreground">{isZh ? '建议先处理高优先级库存告警，再确认供应商到货窗口。' : 'Start with high-priority stock alerts, then confirm supplier delivery windows.'}</p>
        <Button class="w-full" onclick={() => activeView = 'priority'}>{isZh ? '生成今日计划' : 'Generate day plan'}</Button>
      </Card.Content>
    </Card.Root>
  </section>

  <Card.Root class="border-primary/20">
    <Card.Header>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Card.Title class="text-base">{viewCopy.title}</Card.Title>
          <Card.Description>{viewCopy.helper} · {focusedTodos.length} {isZh ? '条聚焦任务' : 'focused tasks'}</Card.Description>
        </div>
        <Badge variant="outline">{viewCopy.badge}</Badge>
      </div>
    </Card.Header>
    <Card.Content class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {#if normalizedView === 'tags'}
        {#each tags as item (item.label)}
          <div class="rounded-lg border bg-muted/20 p-4">
            <p class="font-semibold">{item.label}</p>
            <p class="mt-2 text-2xl font-semibold">{item.count}</p>
            <p class="mt-1 text-xs text-muted-foreground">{isZh ? '关联任务' : 'linked tasks'}</p>
          </div>
        {/each}
      {:else}
        {#each focusedTodos.slice(0, 6) as item (item.id)}
          <article class="rounded-lg border bg-card p-4">
            <div class="flex items-start gap-3">
              {#if item.completed}<CheckCircle2 class="mt-0.5 h-4 w-4 text-success" />{:else}<Circle class="mt-0.5 h-4 w-4 text-muted-foreground" />{/if}
              <div class="min-w-0">
                <p class="font-semibold">{item.title}</p>
                <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{priorityLabel(item.priority)}</Badge>
                  <span class="text-xs text-primary">{item.dueDate}</span>
                </div>
              </div>
            </div>
          </article>
        {/each}
      {/if}
    </Card.Content>
  </Card.Root>
</ContentPageShell>
</div>
