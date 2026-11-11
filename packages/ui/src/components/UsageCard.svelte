<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';
  import QuotaProgressBar, { type QuotaProgressBarProps } from './QuotaProgressBar.svelte';
  import IconBilling from './icons/IconBilling.svelte';

  export interface UsageMetric extends Omit<QuotaProgressBarProps, 'class'> {
    key: string;
  }

  export interface UsageCardProps {
    /** Card title, e.g. 'Plan & Usage' */
    title?: string;
    /** Current plan tier name, e.g. 'Pro Plan' */
    tier?: string;
    /** Next billing or renewal date string */
    renewalDate?: string;
    /** Metrics to track */
    metrics?: UsageMetric[];
    /** Upgrade button text */
    upgradeText?: string;
    /** Callback on upgrade button click */
    onupgrade?: () => void;
    /** Custom extra action in header */
    extra?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title = 'Plan Usage & Quotas',
    tier = 'Pro Plan',
    renewalDate,
    metrics = [],
    upgradeText = 'Upgrade Plan',
    onupgrade,
    extra,
    class: className = '',
  }: UsageCardProps = $props();
</script>

<div
  class={cn('rounded-md border border-border bg-card p-6 text-card-foreground shadow-sm', className)}
  data-svadmin-component="UsageCard"
>
  <div class="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconBilling class="h-5 w-5" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-base font-bold tracking-tight text-foreground">{title}</h3>
          {#if tier}
            <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {tier}
            </span>
          {/if}
        </div>
        {#if renewalDate}
          <p class="mt-0.5 text-xs text-muted-foreground">Renews on {renewalDate}</p>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if extra}
        {@render extra()}
      {:else if onupgrade}
        <button
          type="button"
          onclick={() => onupgrade()}
          class="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {upgradeText}
        </button>
      {/if}
    </div>
  </div>

  {#if metrics.length > 0}
    <div class="mt-5 space-y-4">
      {#each metrics as metric (metric.key)}
        <QuotaProgressBar
          label={metric.label}
          used={metric.used}
          total={metric.total}
          unit={metric.unit}
          warningThreshold={metric.warningThreshold}
          criticalThreshold={metric.criticalThreshold}
          showPercent={metric.showPercent}
          compact={metric.compact ?? false}
        />
      {/each}
    </div>
  {/if}
</div>
