<script lang="ts">
  import { ShieldCheck, ArrowUpRight, AlertTriangle, Calendar, Layers } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface QuotaItem {
    id: string;
    label: string;
    current: number;
    limit: number;
    unit?: string | undefined;
    periodText?: string | undefined;
    warningThreshold?: number | undefined;
    dangerThreshold?: number | undefined;
  }

  export interface PlanUsageQuotaBarProps {
    /** 套餐名称，如 "企业尊享版" 或 "Team Scale" */
    planName?: string | undefined;
    /** 套餐徽标文本，如 "SLA 99.99%" */
    planBadge?: string | undefined;
    /** 配额用量维度列表 */
    quotas: QuotaItem[];
    /** 下次配额重置时间文案，如 "2026-12-01 自动重置" */
    resetDateText?: string | undefined;
    /** 点击升级套餐回调 */
    onupgrade?: (() => void) | undefined;
    class?: string | undefined;
  }

  let {
    planName = '企业旗舰版 (Enterprise)',
    planBadge = '活跃订阅中',
    quotas = [],
    resetDateText,
    onupgrade,
    class: className = '',
  }: PlanUsageQuotaBarProps = $props();

  function getQuotaPercentage(current: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / limit) * 100)));
  }

  function getProgressTone(pct: number, warn = 80, danger = 95) {
    if (pct >= danger) {
      return {
        bar: 'bg-destructive',
        text: 'text-destructive',
        badge: 'bg-destructive/10 text-destructive border-destructive/30',
      };
    }
    if (pct >= warn) {
      return {
        bar: 'bg-warning',
        text: 'text-warning',
        badge: 'bg-warning/10 text-warning border-warning/30',
      };
    }
    return {
      bar: 'bg-primary',
      text: 'text-primary',
      badge: 'bg-primary/10 text-primary border-primary/30',
    };
  }
</script>

<div
  class={cn('rounded-md border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="PlanUsageQuotaBar"
>
  <!-- Plan Summary Line -->
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2.5">
      <div class="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Layers class="h-4 w-4" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-sm text-foreground">{planName}</h3>
          {#if planBadge}
            <span class="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-xs font-semibold text-success font-mono">
              <ShieldCheck class="h-3 w-3" />
              {planBadge}
            </span>
          {/if}
        </div>
        {#if resetDateText}
          <p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
            <Calendar class="h-3 w-3" />
            <span>额度周期: {resetDateText}</span>
          </p>
        {/if}
      </div>
    </div>

    {#if onupgrade}
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
        onclick={onupgrade}
      >
        <span>升级套餐 / 扩容</span>
        <ArrowUpRight class="h-3.5 w-3.5" />
      </button>
    {/if}
  </header>

  <!-- Quota Bars Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
    {#each quotas as q (q.id)}
      {@const pct = getQuotaPercentage(q.current, q.limit)}
      {@const tone = getProgressTone(pct, q.warningThreshold ?? 80, q.dangerThreshold ?? 95)}
      <div class="p-3.5 rounded-lg border border-border/70 bg-muted/20 space-y-2">
        <!-- Top Label & Values -->
        <div class="flex justify-between items-start">
          <div>
            <span class="font-bold text-foreground text-xs">{q.label}</span>
            {#if q.periodText}
              <span class="text-muted-foreground text-xs block">{q.periodText}</span>
            {/if}
          </div>
          <span class={cn('px-1.5 py-0.5 rounded border text-xs font-bold', tone.badge)}>
            {pct}%
          </span>
        </div>

        <!-- Progress Track -->
        <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            class={cn('h-full transition-all duration-300 rounded-full', tone.bar)}
            style={`width: ${pct}%`}
          ></div>
        </div>

        <!-- Numeric Ratio -->
        <div class="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5">
          <span>
            已用: <strong class="text-foreground">{q.current.toLocaleString()}</strong> {q.unit ?? ''}
          </span>
          <span>
            上限: <strong>{q.limit.toLocaleString()}</strong> {q.unit ?? ''}
          </span>
        </div>

        {#if pct >= (q.dangerThreshold ?? 95)}
          <div class="flex items-center gap-1 text-[11px] text-destructive font-semibold pt-1">
            <AlertTriangle class="h-3 w-3" />
            <span>配额即将耗尽，超限将限制写入</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
