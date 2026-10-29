<script lang="ts">
  import { Badge } from './ui/badge/index.js';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import { GANTT_LIMITS, validateGantt } from '@svadmin/core/gantt';
  import { Diamond, RotateCw } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';

  export interface GanttTask {
    id: string;
    title: string;
    startDay: number; // 0-based offset
    durationDays: number;
    progress?: number; // 0 to 100
    category?: string;
    assignee?: string;
    status?: 'planned' | 'in_progress' | 'completed' | 'delayed';
    dependencies?: string[];
    milestone?: boolean;
  }

  interface Props {
    tasks: GanttTask[];
    totalDays?: number;
    dayLabelPrefix?: string;
    onselecttask?: (task: GanttTask) => void;
    loading?: boolean;
    error?: string | undefined;
    onRetry?: () => void;
    ariaLabel?: string;
    class?: string;
  }

  let {
    tasks = [],
    totalDays = 14,
    dayLabelPrefix = 'D',
    onselecttask,
    loading = false,
    error,
    onRetry,
    ariaLabel,
    class: className = '',
  }: Props = $props();

  const days = $derived(
    Array.from({ length: Number.isSafeInteger(totalDays) && totalDays > 0 && totalDays <= GANTT_LIMITS.days ? totalDays : 0 }, (_, i) => `${dayLabelPrefix}${i + 1}`)
  );
  const i18n = useTranslation();
  const validationError = $derived(validateGantt(loading || error ? [] : tasks, totalDays));
  const displayError = $derived(error || (validationError ? i18n.t(`gantt.${validationError}`) : ''));
  const available = $derived(!loading && !displayError);
  function taskLabel(task: GanttTask): string {
    const range = task.milestone ? i18n.t('gantt.milestone', { day: task.startDay + 1 })
      : i18n.t('gantt.range', { start: task.startDay + 1, end: task.startDay + task.durationDays });
    const progress = task.progress === undefined ? '' : `, ${i18n.t('gantt.progress', { progress: task.progress })}`;
    const dependencies = task.dependencies?.length
      ? `, ${i18n.t('gantt.dependsOn', { tasks: task.dependencies.join(', ') })}` : '';
    return `${task.title}, ${range}, ${i18n.t(`gantt.${task.status ?? 'planned'}`)}${progress}${dependencies}`;
  }

  function selectTask(task: GanttTask): void {
    if (available) onselecttask?.(task);
  }

  function getStatusBadgeVariant(status?: string) {
    switch (status) {
      case 'completed':
        return 'bg-success/15 text-success border-success/30';
      case 'delayed':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'in_progress':
        return 'bg-primary/15 text-primary border-primary/30';
      default:
        return 'bg-muted text-muted-foreground border-border/40';
    }
  }

  function getBarColor(status?: string) {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'delayed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
  }
</script>

<div role="region" aria-label={ariaLabel ?? i18n.t('gantt.title')} aria-busy={loading} class={cn('svadmin-gantt border border-border bg-card p-4 text-xs space-y-3', className)}>
  <div class="flex items-center justify-between pb-2 border-b border-border/60">
    <div class="font-semibold text-foreground">
      {i18n.t('gantt.title')} <span class="text-muted-foreground font-normal">({i18n.t('gantt.summary', { tasks: tasks.length, days: totalDays })})</span>
    </div>
  </div>

  {#if loading}
    <div role="status">{i18n.t('common.loading')}</div>
  {:else if displayError}
    <div role="alert">{displayError}</div>
    {#if error && onRetry}
      <Button type="button" variant="ghost" size="sm" onclick={onRetry}><RotateCw aria-hidden="true" />{i18n.t('common.retry')}</Button>
    {/if}
  {:else if tasks.length === 0}
    <div role="status">{i18n.t('gantt.noData')}</div>
  {:else}
  <div class="overflow-x-auto rounded-lg border border-border/60" style="overflow-x: auto;">
    <div class="min-w-[700px]">
      <!-- Timeline Header -->
      <div class="svadmin-gantt__head flex border-b border-border/60 bg-muted/40 font-semibold text-muted-foreground">
        <div class="w-56 p-2.5 border-r border-border/60 text-left shrink-0">{i18n.t('gantt.task')}</div>
        <div class="flex-1 flex">
          {#each days as day (day)}
            <div class="flex-1 p-2 text-center border-r border-border/40 text-[11px] font-mono last:border-r-0">
              {day}
            </div>
          {/each}
        </div>
      </div>

      <!-- Task Rows -->
      <div class="divide-y divide-border/40">
        {#each tasks as task (task.id)}
          {@const leftPct = (task.startDay / totalDays) * 100}
          {@const widthPct = (task.durationDays / totalDays) * 100}
          <!-- 只有配置选择回调时才同时启用按钮角色和键盘焦点。 -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            role={onselecttask ? 'button' : 'group'}
            tabindex={onselecttask ? 0 : undefined}
            aria-label={taskLabel(task)}
            class="flex items-center hover:bg-muted/20 transition-colors cursor-pointer"
            onclick={() => selectTask(task)}
            onkeydown={(e) => {
              if (onselecttask && (e.key === 'Enter' || e.key === ' ') && !e.repeat && !e.isComposing) {
                e.preventDefault();
                selectTask(task);
              }
            }}
          >
            <!-- Task Info Column -->
            <div class="w-56 p-2.5 border-r border-border/60 flex items-center justify-between gap-2 shrink-0">
              <div class="truncate font-medium text-foreground">{task.title}</div>
              {#if task.status}
                <Badge variant="outline" class={cn('text-[9px] px-1 py-0', getStatusBadgeVariant(task.status))}>
                  {i18n.t(`gantt.${task.status}`)}
                </Badge>
              {/if}
            </div>

            <!-- Task Bar Grid Area -->
            <div class="flex-1 relative h-10 flex items-center px-1">
              <!-- Grid vertical guideline background -->
              <div class="absolute inset-0 flex pointer-events-none">
                {#each days as _, idx (idx)}
                  <div class="flex-1 border-r border-border/20 last:border-r-0"></div>
                {/each}
              </div>

              <!-- Bar element -->
              {#if task.milestone}
                <span data-gantt-milestone style={`position: absolute; left: ${leftPct}%; width: 16px; height: 16px;`}>
                  <Diamond aria-hidden="true" size={16} />
                </span>
              {:else}
              <div
                class={cn(
                  'svadmin-gantt__bar relative h-6 flex items-center justify-between px-2 text-[10px] font-medium overflow-hidden transition-all group hover:brightness-110',
                  getBarColor(task.status)
                )}
                style={`margin-left: ${leftPct}%; width: ${widthPct}%; flex-shrink: 0;`}
              >
                <!-- Inner progress fill -->
                {#if task.progress !== undefined}
                  <div
                    class="absolute inset-y-0 left-0 bg-foreground/20 pointer-events-none"
                    style={`width: ${task.progress}%;`}
                  ></div>
                {/if}

                <span class="truncate relative z-10">{task.title}</span>
                {#if task.progress !== undefined}
                  <span class="relative z-10 text-[9px] opacity-90 font-mono">{task.progress}%</span>
                {/if}
              </div>
              {/if}
            </div>
          </div>
        {/each}

      </div>
    </div>
  </div>
  {/if}
</div>
