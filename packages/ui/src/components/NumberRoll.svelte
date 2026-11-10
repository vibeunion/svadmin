<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '../utils.js';
  import { TrendingUp, TrendingDown, Minus } from '@lucide/svelte';

  export interface NumberRollProps {
    value: number;
    from?: number;
    duration?: number;
    decimals?: number;
    separator?: string;
    decimalSeparator?: string;
    prefix?: string;
    suffix?: string;
    trendColor?: boolean;
    showTrendIcon?: boolean;
    class?: string;
    oncomplete?: () => void;
  }

  let {
    value,
    from = 0,
    duration = 1200,
    decimals = 0,
    separator = ',',
    decimalSeparator = '.',
    prefix = '',
    suffix = '',
    trendColor = false,
    showTrendIcon = false,
    class: className = '',
    oncomplete,
  }: NumberRollProps = $props();

  let displayValue = $state<number | null>(null);
  let animationFrameId: number | null = null;
  let previousValue = $state<number | null>(null);

  // 四次缓动减速函数 (Ease Out Quart)
  function easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
  }

  function startAnimation(startVal: number, endVal: number) {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }

    if (duration <= 0) {
      displayValue = endVal;
      previousValue = endVal;
      oncomplete?.();
      return;
    }

    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      displayValue = startVal + (endVal - startVal) * easedProgress;

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        displayValue = endVal;
        previousValue = endVal;
        animationFrameId = null;
        oncomplete?.();
      }
    }

    animationFrameId = requestAnimationFrame(step);
  }

  // 监听 value 变化并平滑缓动
  $effect(() => {
    const currentTarget = value;
    const startVal = previousValue ?? from;
    if (displayValue === null) {
      displayValue = startVal;
    }
    startAnimation(startVal, currentTarget);
  });

  onMount(() => {
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  });

  // 格式化输出数字（带千分位、小数位）
  const formattedNumber = $derived.by(() => {
    const current = displayValue ?? value;
    const fixed = current.toFixed(decimals);
    const parts = fixed.split('.');
    const intPart = parts[0] ?? '0';
    const decPart = parts[1];
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decPart !== undefined ? `${formattedInt}${decimalSeparator}${decPart}` : formattedInt;
  });

  // 趋势计算 (对比 0)
  const isPositive = $derived(value > 0);
  const isNegative = $derived(value < 0);

  const trendColorClass = $derived.by(() => {
    if (!trendColor) return 'text-foreground';
    if (isPositive) return 'text-primary';
    if (isNegative) return 'text-destructive';
    return 'text-muted-foreground';
  });
</script>

<span
  data-svadmin-component="NumberRoll"
  class={cn(
    'inline-flex items-center gap-1 font-mono font-semibold tracking-tight tabular-nums select-none transition-colors',
    trendColorClass,
    className
  )}
>
  {#if showTrendIcon}
    <span class="inline-flex shrink-0 items-center justify-center">
      {#if isPositive}
        <TrendingUp class="h-4 w-4 text-primary" />
      {:else if isNegative}
        <TrendingDown class="h-4 w-4 text-destructive" />
      {:else}
        <Minus class="h-4 w-4 text-muted-foreground" />
      {/if}
    </span>
  {/if}

  {#if prefix}
    <span class="text-xs font-normal text-muted-foreground">{prefix}</span>
  {/if}

  <span class="text-base font-bold">{formattedNumber}</span>

  {#if suffix}
    <span class="text-xs font-normal text-muted-foreground">{suffix}</span>
  {/if}
</span>
