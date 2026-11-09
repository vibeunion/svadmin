<script lang="ts">
  import { cn } from '../utils.js';

  export interface QuotaProgressBarProps {
    /** Usage metric label (e.g., 'API Requests', 'Storage') */
    label: string;
    /** Current used amount */
    used: number;
    /** Total allocated quota limit */
    total: number;
    /** Metric unit suffix (e.g. 'GB', 'calls', 'seats') */
    unit?: string | undefined;
    /** Ratio for warning state (0-1). Defaults to 0.8 (80%) */
    warningThreshold?: number | undefined;
    /** Ratio for critical state (0-1). Defaults to 0.95 (95%) */
    criticalThreshold?: number | undefined;
    /** Whether to display the percentage badge. Defaults to true */
    showPercent?: boolean | undefined;
    /** Optional custom number formatter */
    formatter?: ((val: number) => string) | undefined;
    /** Optional extra description or action */
    description?: string | undefined;
    /** Compact inline single-line display */
    compact?: boolean | undefined;
    /** Additional CSS classes */
    class?: string | undefined;
  }

  let {
    label,
    used,
    total,
    unit = '',
    warningThreshold = 0.8,
    criticalThreshold = 0.95,
    showPercent = true,
    formatter = (val) => val.toLocaleString(),
    description,
    compact = false,
    class: className = '',
  }: QuotaProgressBarProps = $props();

  const ratio = $derived(total > 0 ? Math.min(1, Math.max(0, used / total)) : 0);
  const boundedUsed = $derived(total > 0 ? Math.min(total, Math.max(0, used)) : 0);
  const percent = $derived(Math.round(ratio * 100));

  const status = $derived(
    ratio >= criticalThreshold
      ? 'critical'
      : ratio >= warningThreshold
        ? 'warning'
        : 'normal',
  );

  const statusColorClass = $derived(
    status === 'critical'
      ? 'bg-destructive'
      : status === 'warning'
        ? 'bg-warning'
        : 'bg-primary',
  );

  const statusBadgeColorClass = $derived(
    status === 'critical'
      ? 'bg-destructive/10 text-destructive'
      : status === 'warning'
        ? 'bg-warning/10 text-warning'
        : 'bg-primary/10 text-primary',
  );
</script>

<div
  class={cn('w-full rounded-lg border border-border bg-card p-4 text-card-foreground', className)}
  data-svadmin-component="QuotaProgressBar"
  data-status={status}
>
  {#if compact}
    <div class="flex items-center justify-between gap-4 text-sm">
      <div class="flex items-center gap-2 truncate">
        <span class="font-medium text-foreground">{label}</span>
        <span class="text-xs text-muted-foreground">
          {formatter(used)}{unit ? ` ${unit}` : ''} / {formatter(total)}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <div class="h-2 w-32 overflow-hidden rounded-full bg-secondary">
          <div
            class={cn('h-full transition-all duration-300', statusColorClass)}
            style="width: {percent}%"
            role="progressbar"
            aria-valuenow={boundedUsed}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={label}
          ></div>
        </div>
        {#if showPercent}
          <span class={cn('rounded px-1.5 py-0.5 text-xs font-semibold', statusBadgeColorClass)}>
            {percent}%
          </span>
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-foreground">{label}</span>
        {#if showPercent}
          <span class={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusBadgeColorClass)}>
            {percent}%
          </span>
        {/if}
      </div>
      <div class="text-sm font-medium text-muted-foreground">
        <span class="text-foreground font-semibold">{formatter(used)}</span>
        {#if unit} <span class="text-xs">{unit}</span>{/if}
        <span class="mx-1">/</span>
        <span>{formatter(total)}</span>
        {#if unit} <span class="text-xs">{unit}</span>{/if}
      </div>
    </div>

    <div class="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        class={cn('h-full transition-all duration-300', statusColorClass)}
        style="width: {percent}%"
        role="progressbar"
        aria-valuenow={boundedUsed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
      ></div>
    </div>

    {#if description}
      <p class="mt-2 text-xs text-muted-foreground">{description}</p>
    {/if}
  {/if}
</div>
