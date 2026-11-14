<script lang="ts">
  import { untrack } from 'svelte';
  import { Terminal, Play, Pause, Trash2, Search, CheckCircle2, AlertTriangle, AlertCircle, Bug } from '@lucide/svelte';

  export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

  export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    meta?: Record<string, unknown> | undefined;
  }

  export interface LiveStreamLogViewerProps {
    title?: string | undefined;
    logs?: LogEntry[] | undefined;
    streaming?: boolean | undefined;
    autoScroll?: boolean | undefined;
    maxEntries?: number | undefined;
    class?: string | undefined;
    onclear?: (() => void) | undefined;
    ontogglestream?: ((active: boolean) => void) | undefined;
  }

  const defaultStarterLogs: LogEntry[] = [
    { id: 'l1', timestamp: '08:45:10.102', level: 'INFO', message: '[Gateway] Inbound HTTP POST /api/v1/orders/create (200 OK, latency: 18ms)' },
    { id: 'l2', timestamp: '08:45:10.245', level: 'INFO', message: '[PostgreSQL] Acquired pool connection #12 for transaction tx_88192' },
    { id: 'l3', timestamp: '08:45:11.002', level: 'WARN', message: '[Redis] Cache miss on key "session:usr_9901", fallback to primary database' },
    { id: 'l4', timestamp: '08:45:11.450', level: 'ERROR', message: '[NotificationService] Third-party SMS webhook timed out after 3000ms' },
    { id: 'l5', timestamp: '08:45:12.010', level: 'DEBUG', message: '[JobRunner] Dispatched background task "billing_daily_snapshot" to worker_03' }
  ];

  let {
    title = '实时流式日志终端',
    logs = defaultStarterLogs,
    streaming = true,
    autoScroll = true,
    maxEntries = 500,
    class: className = '',
    onclear = undefined,
    ontogglestream = undefined,
  }: LiveStreamLogViewerProps = $props();

  let isStreaming = $state(untrack(() => streaming));
  let isAutoScroll = $state(untrack(() => autoScroll));
    let selectedLevel = $state<string>('ALL');
  let searchQuery = $state('');

  const filteredLogs = $derived.by(() => {
    return logs
      .filter((l) => selectedLevel === 'ALL' || l.level === selectedLevel)
      .filter((l) => !searchQuery.trim() || l.message.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(-maxEntries);
  });

  function getLevelConfig(level: LogLevel) {
    switch (level) {
      case 'INFO':
        return { label: 'INFO', icon: CheckCircle2, badge: 'text-info bg-info/10 border-info/20' };
      case 'WARN':
        return { label: 'WARN', icon: AlertTriangle, badge: 'text-warning bg-warning/10 border-warning/20' };
      case 'ERROR':
        return { label: 'ERROR', icon: AlertCircle, badge: 'text-destructive bg-destructive/10 border-destructive/20 font-bold' };
      case 'DEBUG':
        return { label: 'DEBUG', icon: Bug, badge: 'text-muted-foreground bg-muted border-border' };
    }
  }

  function toggleStream() {
    isStreaming = !isStreaming;
    ontogglestream?.(isStreaming);
  }
</script>

<div
  class="flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden {className}"
  data-svadmin-component="LiveStreamLogViewer"
>
  <!-- Header -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-3.5">
    <div class="flex items-center gap-2">
      <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Terminal class="h-4 w-4" />
      </div>
      <div>
        <h3 class="text-xs font-semibold text-foreground flex items-center gap-2">
          <span>{title}</span>
          {#if isStreaming}
            <span class="inline-flex items-center gap-1 text-[10px] text-success">
              <span class="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
              LIVE 运行中
            </span>
          {:else}
            <span class="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground"></span>
              PAUSED 已暂停
            </span>
          {/if}
        </h3>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-1.5 text-xs">
      <!-- Search Input -->
      <div class="relative flex items-center">
        <Search class="h-3 w-3 absolute left-2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="关键词匹配…"
          bind:value={searchQuery}
          class="h-7 w-32 md:w-44 rounded-md border border-border bg-background pl-6 pr-2 text-xs text-foreground outline-none focus:border-primary"
        />
      </div>

      <!-- Level Pills -->
      <button
        type="button"
        class="h-7 px-2 rounded-md border border-border bg-background text-[11px] font-mono hover:bg-muted transition-colors"
        class:text-primary={isAutoScroll}
        onclick={() => { isAutoScroll = !isAutoScroll; }}
      >
        {isAutoScroll ? "跟随" : "固定"}
      </button>
      <div class="flex items-center rounded-md border border-border bg-background p-0.5">
        {#each ['ALL', 'INFO', 'WARN', 'ERROR'] as lvl (lvl)}
          <button
            type="button"
            class="rounded px-2 py-0.5 text-[10px] font-semibold transition-colors {selectedLevel === lvl ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => { selectedLevel = lvl; }}
          >
            {lvl}
          </button>
        {/each}
      </div>

      <!-- Stream Control Button -->
      <button
        type="button"
        class="h-7 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1"
        onclick={toggleStream}
      >
        {#if isStreaming}
          <Pause class="h-3 w-3 text-warning" />
          <span>暂停</span>
        {:else}
          <Play class="h-3 w-3 text-success" />
          <span>恢复</span>
        {/if}
      </button>

      {#if onclear}
        <button
          type="button"
          class="h-7 px-2 rounded-md border border-border bg-background text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
          onclick={() => onclear?.()}
          aria-label="Clear logs"
        >
          <Trash2 class="h-3 w-3" />
        </button>
      {/if}
    </div>
  </header>

  <!-- Log Console Stream Body -->
  <div class="p-3 bg-muted/10 font-mono text-xs overflow-y-auto max-h-[360px] min-h-[200px] flex flex-col gap-1.5 divide-y divide-border/20">
    {#if filteredLogs.length === 0}
      <div class="py-12 text-center text-muted-foreground text-xs font-sans">
        暂无匹配日志输出
      </div>
    {:else}
      {#each filteredLogs as log (log.id)}
        {@const lvlMeta = getLevelConfig(log.level)}
        <div class="pt-1.5 flex items-start gap-2 leading-relaxed">
          <span class="text-muted-foreground text-[11px] shrink-0">{log.timestamp}</span>
          <span class="inline-flex rounded border px-1 py-0.2 text-[9px] font-bold shrink-0 {lvlMeta.badge}">
            {lvlMeta.label}
          </span>
          <span class="text-foreground break-all flex-1">{log.message}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
