<script lang="ts">
  import { TrendingUp, TrendingDown, Minus } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface TrendIndicatorProps {
    /** Current numeric or string value / rate (e.g. 12.5, '+12.5%', -3.2) */
    value?: number | string | undefined;
    /** Previous reference value to automatically compute percentage change */
    prevValue?: number | undefined;
    /** Explicit direction override */
    direction?: 'up' | 'down' | 'neutral' | undefined;
    /** Display prefix (e.g. 'YoY', '环比', 'MoM') */
    prefix?: string | undefined;
    /** Display suffix (default: '%') */
    suffix?: string | undefined;
    /** Number of decimal places when auto computing rate (default: 1) */
    precision?: number | undefined;
    /** Invert color semantics (useful for error rate, latency, queue backlog where lower is better) */
    reverseColor?: boolean | undefined;
    /** Visual style variant: 'text' (inline text), 'badge' (pill badge with subtle background), 'solid' */
    variant?: 'text' | 'badge' | 'solid' | undefined;
    /** Size: 'sm' | 'md' | 'lg' */
    size?: 'sm' | 'md' | 'lg' | undefined;
    /** Whether to render trending arrow icon (default: true) */
    showIcon?: boolean | undefined;
    /** Extra classes */
    class?: string | undefined;
  }

  let {
    value,
    prevValue,
    direction,
    prefix,
    suffix = '%',
    precision = 1,
    reverseColor = false,
    variant = 'text',
    size = 'md',
    showIcon = true,
    class: className = '',
  }: TrendIndicatorProps = $props();

  const computed = $derived.by(() => {
    // 1. 若同时传入了 value (数值) 与 prevValue，自动计算增长率
    if (typeof value === 'number' && typeof prevValue === 'number' && prevValue !== 0) {
      const diff = value - prevValue;
      const rateNum = (diff / Math.abs(prevValue)) * 100;
      const dir: 'up' | 'down' | 'neutral' = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
      const formatted = Math.abs(rateNum).toFixed(precision);
      return {
        direction: direction ?? dir,
        text: `${formatted}${suffix}`,
      };
    }

    // 2. 若传入的是纯数字
    if (typeof value === 'number') {
      const dir: 'up' | 'down' | 'neutral' = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
      const formatted = Math.abs(value).toFixed(precision);
      return {
        direction: direction ?? dir,
        text: `${formatted}${suffix}`,
      };
    }

    // 3. 若传入的是字符串 (如 "+12.5%", "8.4")
    if (typeof value === 'string') {
      const trimmed = value.trim();
      let dir: 'up' | 'down' | 'neutral' = 'neutral';
      if (trimmed.startsWith('+')) {
        dir = 'up';
      } else if (trimmed.startsWith('-')) {
        dir = 'down';
      } else {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed)) {
          dir = parsed > 0 ? 'up' : parsed < 0 ? 'down' : 'neutral';
        }
      }
      return {
        direction: direction ?? dir,
        text: trimmed,
      };
    }

    return {
      direction: direction ?? 'neutral',
      text: `--`,
    };
  });

  const isPositive = $derived(
    computed.direction === 'neutral'
      ? null
      : reverseColor
        ? computed.direction === 'down'
        : computed.direction === 'up'
  );

  const sizeClasses = $derived.by(() => {
    switch (size) {
      case 'sm':
        return 'text-[11px] gap-0.5 px-1.5 py-0.5';
      case 'lg':
        return 'text-sm gap-1 px-2.5 py-1';
      case 'md':
      default:
        return 'text-xs gap-1 px-2 py-0.5';
    }
  });

  const iconSizeClasses = $derived.by(() => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-4 w-4';
      case 'md':
      default:
        return 'h-3.5 w-3.5';
    }
  });

  const colorClasses = $derived.by(() => {
    if (isPositive === null) {
      return variant === 'solid'
        ? 'bg-muted text-muted-foreground'
        : variant === 'badge'
          ? 'bg-muted/50 text-muted-foreground'
          : 'text-muted-foreground';
    }

    if (isPositive) {
      return variant === 'solid'
        ? 'bg-success text-success-foreground'
        : variant === 'badge'
          ? 'bg-success/15 text-success border border-success/20'
          : 'text-success';
    }

    return variant === 'solid'
      ? 'bg-destructive text-destructive-foreground'
      : variant === 'badge'
        ? 'bg-destructive/15 text-destructive border border-destructive/20'
        : 'text-destructive';
  });
</script>

<span
  data-svadmin-component="TrendIndicator"
  class={cn(
    'inline-flex items-center font-medium font-mono select-none transition-colors',
    variant !== 'text' && 'rounded-full font-semibold',
    sizeClasses,
    colorClasses,
    className
  )}
>
  {#if prefix}
    <span class="font-sans text-[11px] font-normal text-muted-foreground mr-0.5">
      {prefix}
    </span>
  {/if}

  {#if showIcon}
    {#if computed.direction === 'up'}
      <TrendingUp class={cn(iconSizeClasses, 'shrink-0')} />
    {:else if computed.direction === 'down'}
      <TrendingDown class={cn(iconSizeClasses, 'shrink-0')} />
    {:else}
      <Minus class={cn(iconSizeClasses, 'shrink-0')} />
    {/if}
  {/if}

  <span>{computed.text}</span>
</span>
