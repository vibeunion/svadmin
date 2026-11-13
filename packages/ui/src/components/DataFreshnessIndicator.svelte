<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { RotateCw, Clock } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  const i18n = useTranslation();

  export type FreshnessStatus = 'live' | 'fresh' | 'stale' | 'offline';
  export type PollInterval = 0 | 5 | 15 | 30 | 60 | 300;

  export interface DataFreshnessIndicatorProps {
    /** 上次同步时间点 */
    lastUpdated: Date | string | number;
    /** 过期告警阈值（毫秒），默认 60000 (1分钟) */
    staleThresholdMs?: number | undefined;
    /** 自动轮询周期（秒），0 表示手动刷新 */
    pollInterval?: PollInterval | undefined;
    /** 是否处于数据同步中 */
    loading?: boolean | undefined;
    /** 切换轮询周期回调 */
    onintervalchange?: ((interval: PollInterval) => void) | undefined;
    /** 手动立即同步回调 */
    onsyncnow?: (() => Promise<void> | void) | undefined;
    class?: string | undefined;
  }

  let {
    lastUpdated,
    staleThresholdMs = 60000,
    pollInterval = 30,
    loading = false,
    onintervalchange,
    onsyncnow,
    class: className = '',
  }: DataFreshnessIndicatorProps = $props();

  let elapsedSeconds = $state(0);
  let intervalTimer: ReturnType<typeof setInterval> | null = null;
  let currentPollInterval = $derived<PollInterval>(pollInterval);

  function calculateElapsed() {
    try {
      const target = new Date(lastUpdated).getTime();
      const now = Date.now();
      elapsedSeconds = Math.max(0, Math.floor((now - target) / 1000));
    } catch {
      elapsedSeconds = 0;
    }
  }

  const status = $derived.by<FreshnessStatus>(() => {
    if (elapsedSeconds * 1000 >= staleThresholdMs) return 'stale';
    if (elapsedSeconds <= 15) return 'live';
    return 'fresh';
  });

  const relativeText = $derived.by(() => {
    if (loading) return '正在同步数据...';
    if (elapsedSeconds < 5) return '刚刚更新';
    if (elapsedSeconds < 60) return `${elapsedSeconds} 秒前`;
    const mins = Math.floor(elapsedSeconds / 60);
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    return `${hours} 小时前`;
  });

  const statusTone = $derived.by(() => {
    switch (status) {
      case 'live':
        return {
          pill: 'bg-success/10 text-success border-success/30',
          dot: 'bg-success animate-pulse',
        };
      case 'stale':
        return {
          pill: 'bg-warning/10 text-warning border-warning/30',
          dot: 'bg-warning',
        };
      case 'fresh':
      default:
        return {
          pill: 'bg-primary/10 text-primary border-primary/30',
          dot: 'bg-primary',
        };
    }
  });

  function handleIntervalChange(e: Event) {
    const val = Number((e.currentTarget as HTMLSelectElement).value) as PollInterval;
    currentPollInterval = val;
    onintervalchange?.(val);
  }

  onMount(() => {
    calculateElapsed();
    intervalTimer = setInterval(calculateElapsed, 1000);
  });

  onDestroy(() => {
    if (intervalTimer) clearInterval(intervalTimer);
  });
</script>

<div
  class={cn(
    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono select-none transition-all shadow-2xs',
    statusTone.pill,
    className
  )}
  data-svadmin-component="DataFreshnessIndicator"
  data-freshness={status}
>
  <!-- Pulsing Indicator Dot -->
  <span class="relative flex h-2 w-2 shrink-0">
    {#if status === 'live' && !loading}
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
    {/if}
    <span class={cn('relative inline-flex rounded-full h-2 w-2', statusTone.dot)}></span>
  </span>

  <!-- Relative Freshness Text -->
  <button
    type="button"
    class="font-semibold text-foreground hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
    onclick={() => onsyncnow?.()}
    title="点击立即同步最新数据"
  >
    {#if loading}
      <RotateCw class="h-3 w-3 animate-spin text-primary" />
    {:else}
      <Clock class="h-3 w-3 opacity-60" />
    {/if}
    <span>{relativeText}</span>
  </button>

  <!-- Auto-poll interval selector -->
  <div class="flex items-center gap-1 border-l border-current/20 pl-2">
    <select
      class="bg-transparent text-[11px] font-mono outline-none text-foreground cursor-pointer"
      value={currentPollInterval}
      onchange={handleIntervalChange}
      aria-label={i18n.t('common.pollInterval')}
    >
      <option value={5} class="text-foreground bg-card">5秒自动刷新</option>
      <option value={15} class="text-foreground bg-card">15秒自动刷新</option>
      <option value={30} class="text-foreground bg-card">30秒自动刷新</option>
      <option value={60} class="text-foreground bg-card">1分钟自动刷新</option>
      <option value={0} class="text-foreground bg-card">手动刷新</option>
    </select>
  </div>
</div>
