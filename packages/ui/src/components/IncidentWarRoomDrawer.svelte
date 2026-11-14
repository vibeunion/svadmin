<script lang="ts">
  import {
    Flame,
    Activity,
    CheckCircle2,
    Send,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import * as Sheet from './ui/sheet/index.js';

  export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3';

  export interface IncidentTimelineEvent {
    id: string;
    timestamp: string;
    author: string;
    note: string;
    stage: 'alert' | 'triage' | 'mitigated' | 'resolved';
  }

  export interface IncidentWarRoomDrawerProps {
    open?: boolean | undefined;
    incidentId: string;
    title: string;
    severity?: IncidentSeverity | undefined;
    impactUsers?: number | undefined;
    startedAt?: string | undefined;
    timeline?: IncidentTimelineEvent[] | undefined;
    class?: string | undefined;
    onAddNote?: ((note: string) => void) | undefined;
    onTriggerMitigation?: ((actionName: string) => void) | undefined;
    onResolveIncident?: ((id: string) => void) | undefined;
  }

  let {
    open = $bindable(false),
    incidentId = 'INC-2026-902',
    title: incidentTitle = '生产主数据库连接池耗尽告警',
    severity = 'P0',
    impactUsers = 18400,
    startedAt = '10分钟前',
    timeline = [
      { id: '1', timestamp: '14:20', author: 'Prometheus AlertManager', stage: 'alert', note: '检测到 DB 连接数达到 98% 告警阈值' },
      { id: '2', timestamp: '14:24', author: '值班架构师 (Ada)', stage: 'triage', note: '确认慢查询导致连接无法释放，准备开启网关降级' },
      { id: '3', timestamp: '14:28', author: '运维工程师 (Lin)', stage: 'mitigated', note: '已执行只读从库流量分流，主库连接数回落至 42%' },
    ],
    class: className = '',
    onAddNote,
    onTriggerMitigation,
    onResolveIncident,
  }: IncidentWarRoomDrawerProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let newNoteText = $state('');

  function handleSendNote() {
    const text = newNoteText.trim();
    if (!text) return;
    onAddNote?.(text);
    newNoteText = '';
  }

  const severityColors: Record<IncidentSeverity, string> = {
    P0: 'bg-destructive text-destructive-foreground font-black',
    P1: 'bg-destructive/80 text-destructive-foreground font-bold',
    P2: 'bg-warning text-warning-foreground font-bold',
    P3: 'bg-muted text-foreground',
  };
</script>

<Sheet.Root bind:open side="right">
  <Sheet.Content class={cn('w-full sm:max-w-xl p-0 flex flex-col text-xs', className)}>
    <!-- Header -->
    <div class="px-6 py-5 border-b border-border/70 bg-card">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class={cn('rounded px-2 py-0.5 text-xs font-mono uppercase', severityColors[severity])}>
            {severity} {chinese ? '特大故障' : 'Incident'}
          </span>
          <span class="font-mono text-muted-foreground">{incidentId}</span>
        </div>

        <div class="flex items-center gap-2">
          {#if onResolveIncident}
            <Button
              size="sm"
              class="h-7 text-xs gap-1 bg-success text-success-foreground hover:bg-success/90"
              onclick={() => onResolveIncident(incidentId)}
            >
              <CheckCircle2 class="h-3.5 w-3.5" />
              <span>{chinese ? '宣布故障已恢复' : 'Resolve'}</span>
            </Button>
          {/if}
        </div>
      </div>

      <Sheet.Title class="text-base font-bold text-foreground mt-2">
        {incidentTitle}
      </Sheet.Title>

      <!-- Impact Stats Bar -->
      <div class="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border border-border/60 mt-3 font-mono">
        <div>
          <span class="block text-[10px] text-muted-foreground uppercase">{chinese ? '影响用户数' : 'Impacted Users'}</span>
          <span class="font-bold text-destructive text-sm mt-0.5 block">{impactUsers.toLocaleString()}</span>
        </div>
        <div>
          <span class="block text-[10px] text-muted-foreground uppercase">{chinese ? '持续时长' : 'Duration'}</span>
          <span class="font-bold text-foreground text-sm mt-0.5 block">{startedAt}</span>
        </div>
      </div>
    </div>

    <!-- Quick Mitigation Actions -->
    <div class="px-6 py-3 border-b border-border/60 bg-destructive/5 space-y-2">
      <div class="font-bold text-[11px] text-destructive uppercase tracking-wider flex items-center gap-1.5">
        <Flame class="h-3.5 w-3.5" />
        <span>{chinese ? '紧急应急止血动作' : 'Emergency Mitigations'}</span>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
          onclick={() => onTriggerMitigation?.('throttle_readonly')}
        >
          {chinese ? '网关只读限流降级' : 'Read-only Throttle'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
          onclick={() => onTriggerMitigation?.('flush_cache')}
        >
          {chinese ? '清空分布式缓存' : 'Flush Cache'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
          onclick={() => onTriggerMitigation?.('isolate_gateway')}
        >
          {chinese ? '隔离故障节点' : 'Isolate Node'}
        </Button>
      </div>
    </div>

    <!-- Timeline Log -->
    <div class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
      <div class="font-bold text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Activity class="h-3.5 w-3.5 text-primary" />
        <span>{chinese ? '应急响应处置时间轴' : 'Incident Response Timeline'}</span>
      </div>

      <div class="space-y-2 pl-3 border-l-2 border-primary/30 ml-2">
        {#each timeline as item (item.id)}
          <div class="relative pl-3 space-y-1 bg-card border border-border/70 p-2.5 rounded-lg shadow-2xs">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold text-foreground">{item.author}</span>
              <span class="font-mono text-muted-foreground">{item.timestamp}</span>
            </div>
            <p class="text-foreground leading-relaxed text-xs">{item.note}</p>
          </div>
        {/each}
      </div>
    </div>

    <!-- Add Note Footer -->
    <div class="p-4 border-t border-border/70 bg-card space-y-2">
      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={newNoteText}
          placeholder={chinese ? '同步应急进展或处置备注…' : 'Add progress note…'}
          class="h-8.5 flex-1 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none"
        />
        <Button size="sm" onclick={handleSendNote} disabled={!newNoteText.trim()} class="h-8.5 px-3 gap-1">
          <Send class="h-3.5 w-3.5" />
          <span>{chinese ? '发送' : 'Send'}</span>
        </Button>
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
