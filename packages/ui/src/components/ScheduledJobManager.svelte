<script lang="ts">
  import {
    CalendarClock,
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileText,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export type ScheduledJobStatus = 'active' | 'paused' | 'running' | 'failed';

  export interface ScheduledJobItem {
    id: string;
    name: string;
    cron: string;
    nextRunText: string;
    lastRunText?: string | undefined;
    status: ScheduledJobStatus;
    durationMs?: number | undefined;
    description?: string | undefined;
  }

  export interface ScheduledJobManagerProps {
    jobs?: ScheduledJobItem[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onTriggerJob?: ((job: ScheduledJobItem) => void | Promise<void>) | undefined;
    onToggleJobStatus?: ((job: ScheduledJobItem, newStatus: ScheduledJobStatus) => void) | undefined;
    onViewLogs?: ((job: ScheduledJobItem) => void) | undefined;
  }

  let {
    jobs = [
      { id: 'job-settle', name: '夜间财务自动化对账清算', cron: '0 2 * * *', nextRunText: '04:12:30 后触发', lastRunText: '今日 02:00 (成功)', status: 'active', durationMs: 1420 },
      { id: 'job-backup', name: '全量分布式冷备份快照', cron: '0 4 * * 0', nextRunText: '3天后触发', lastRunText: '上周日 04:00 (成功)', status: 'active', durationMs: 84000 },
      { id: 'job-es-sync', name: '搜索引擎全量增量索引同步', cron: '*/30 * * * *', nextRunText: '12分钟后触发', lastRunText: '18分钟前 (成功)', status: 'active', durationMs: 380 },
      { id: 'job-report', name: '周报分析预聚合计算', cron: '0 8 * * 1', nextRunText: '暂停中', lastRunText: '前天 08:00 (失败)', status: 'paused' },
    ],
    title,
    description,
    class: className = '',
    onTriggerJob,
    onToggleJobStatus,
    onViewLogs,
  }: ScheduledJobManagerProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let triggeringId = $state<string | null>(null);

  async function handleTrigger(job: ScheduledJobItem) {
    triggeringId = job.id;
    try {
      await onTriggerJob?.(job);
    } finally {
      setTimeout(() => {
        triggeringId = null;
      }, 800);
    }
  }

  function handleToggle(job: ScheduledJobItem) {
    const nextStatus: ScheduledJobStatus = job.status === 'active' ? 'paused' : 'active';
    onToggleJobStatus?.(job, nextStatus);
  }

  const statusStyles: Record<ScheduledJobStatus, string> = {
    active: 'text-success bg-success/10 border-success/30',
    paused: 'text-muted-foreground bg-muted border-border',
    running: 'text-primary bg-primary/10 border-primary/30',
    failed: 'text-destructive bg-destructive/10 border-destructive/30',
  };

  const statusLabels = $derived<Record<ScheduledJobStatus, string>>({
    active: chinese ? '计划运行中' : 'Active',
    paused: chinese ? '已暂停调度' : 'Paused',
    running: chinese ? '执行中…' : 'Running…',
    failed: chinese ? '上次异常' : 'Failed',
  });

  const resolvedTitle = $derived(title ?? (chinese ? '定时任务调度执行大盘' : 'Scheduled Jobs Manager'));
  const resolvedDesc = $derived(
    description ?? (chinese ? 'Cron 调度规则监控、下次触发倒计时与手动即时触发流转' : 'Manage automated cron tasks and trigger manual executions'),
  );
</script>

<div
  data-svadmin-component="ScheduledJobManager"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4 flex flex-col text-xs',
    className,
  )}
>
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <CalendarClock class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>

    <div class="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
      <span>{jobs.filter((j) => j.status === 'active').length} {chinese ? '个活跃任务' : 'active'}</span>
    </div>
  </div>

  <!-- Jobs Table -->
  <div class="rounded-xl border border-border overflow-hidden">
    <table class="w-full text-left text-xs border-collapse">
      <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
        <tr>
          <th class="p-3">{chinese ? '任务名称 / 业务标识' : 'Job Name'}</th>
          <th class="p-3 w-36">{chinese ? 'Cron 表达式' : 'Cron Schedule'}</th>
          <th class="p-3 w-36">{chinese ? '下次触发' : 'Next Execution'}</th>
          <th class="p-3 w-28 text-center">{chinese ? '调度状态' : 'Status'}</th>
          <th class="p-3 w-40 text-right">{chinese ? '操作' : 'Actions'}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60">
        {#each jobs as job (job.id)}
          {@const isRunning = triggeringId === job.id || job.status === 'running'}
          <tr class="hover:bg-muted/20">
            <!-- Job title -->
            <td class="p-3">
              <div class="font-bold text-foreground text-xs">{job.name}</div>
              <div class="font-mono text-[11px] text-muted-foreground mt-0.5">{job.id}</div>
            </td>

            <!-- Cron -->
            <td class="p-3">
              <span class="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground border border-border/80">
                {job.cron}
              </span>
            </td>

            <!-- Next Run -->
            <td class="p-3">
              <span class="font-mono text-xs text-primary font-medium">{job.nextRunText}</span>
              {#if job.lastRunText}
                <div class="text-[10px] text-muted-foreground mt-0.5">{job.lastRunText}</div>
              {/if}
            </td>

            <!-- Status -->
            <td class="p-3 text-center">
              <span class={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold border', statusStyles[job.status])}>
                {#if job.status === 'active'}
                  <CheckCircle2 class="h-3 w-3" />
                {:else if job.status === 'failed'}
                  <AlertCircle class="h-3 w-3" />
                {:else if isRunning}
                  <Loader2 class="h-3 w-3 animate-spin" />
                {/if}
                <span>{statusLabels[job.status]}</span>
              </span>
            </td>

            <!-- Actions -->
            <td class="p-3 text-right">
              <div class="inline-flex items-center gap-1.5 justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  class="h-7 px-2 text-xs gap-1"
                  disabled={isRunning}
                  onclick={() => handleTrigger(job)}
                  title={chinese ? '手动立即执行一次' : 'Trigger Now'}
                >
                  {#if isRunning}
                    <Loader2 class="h-3 w-3 animate-spin text-primary" />
                    <span>{chinese ? '触发中' : 'Triggering'}</span>
                  {:else}
                    <Play class="h-3 w-3 text-primary" />
                    <span>{chinese ? '立即执行' : 'Run'}</span>
                  {/if}
                </Button>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  class="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onclick={() => handleToggle(job)}
                  title={job.status === 'active' ? (chinese ? '暂停调度' : 'Pause') : (chinese ? '恢复调度' : 'Resume')}
                >
                  {#if job.status === 'active'}
                    <Pause class="h-3.5 w-3.5" />
                  {:else}
                    <RotateCcw class="h-3.5 w-3.5" />
                  {/if}
                </Button>

                {#if onViewLogs}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    class="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onclick={() => onViewLogs(job)}
                    title={chinese ? '查看执行日志' : 'Logs'}
                  >
                    <FileText class="h-3.5 w-3.5" />
                  </Button>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
