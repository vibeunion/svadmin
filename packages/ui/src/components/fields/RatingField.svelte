<script module lang="ts">
  export type RatingSize = 'sm' | 'default' | 'lg';
</script>

<script lang="ts">
  import { Star, StarHalf } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    value?: number | string | null | undefined;
    max?: number;
    showValue?: boolean;
    size?: RatingSize;
    nullLabel?: string;
    class?: string;
  }

  let {
    value,
    max = 5,
    showValue = false,
    size = 'default',
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  const normalizedMax = $derived(
    Number.isFinite(max) ? Math.min(100, Math.max(1, Math.trunc(max))) : 5
  );

  const numericValue = $derived.by(() => {
    if (value == null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.min(normalizedMax, parsed));
  });

  const sizeClasses: Record<RatingSize, { icon: string; text: string }> = {
    sm: { icon: 'h-3.5 w-3.5', text: 'text-xs' },
    default: { icon: 'h-4 w-4', text: 'text-sm' },
    lg: { icon: 'h-5 w-5', text: 'text-base' },
  };

  const stars = $derived.by(() => {
    if (numericValue === null) return [];
    const result: ('full' | 'half' | 'empty')[] = [];
    for (let index = 1; index <= normalizedMax; index += 1) {
      if (numericValue >= index) {
        result.push('full');
      } else if (numericValue >= index - 0.5) {
        result.push('half');
      } else {
        result.push('empty');
      }
    }
    return result;
  });
</script>

{#if numericValue === null}
  <span class={cn('field-rating text-muted-foreground text-sm', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-rating inline-flex items-center gap-1.5', className)}>
    <div
      class="inline-flex items-center gap-0.5 text-amber-500"
      role="img"
      aria-label={`${numericValue} out of ${normalizedMax}`}
    >
      {#each stars as starType, idx (idx)}
        {#if starType === 'full'}
          <Star aria-hidden="true" class={cn(sizeClasses[size].icon, 'fill-amber-500 text-amber-500')} />
        {:else if starType === 'half'}
          <StarHalf aria-hidden="true" class={cn(sizeClasses[size].icon, 'fill-amber-500 text-amber-500')} />
        {:else}
          <Star aria-hidden="true" class={cn(sizeClasses[size].icon, 'text-muted-foreground/30')} />
        {/if}
      {/each}
    </div>
    {#if showValue}
      <span class={cn('tabular-nums font-medium text-foreground', sizeClasses[size].text)}>
        {numericValue}
      </span>
    {/if}
  </div>
{/if}
