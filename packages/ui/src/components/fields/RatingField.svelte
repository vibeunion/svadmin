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
    sm: { icon: 'svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c', text: 'svadmin-u-359090c2d529' },
    default: { icon: 'svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3', text: 'svadmin-u-fc7473ca09eb' },
    lg: { icon: 'svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e', text: 'svadmin-u-4ee734926ff6' },
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
  <span class={cn('field-rating svadmin-u-bfa603190748 svadmin-u-fc7473ca09eb', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-rating svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568', className)}>
    <div
      class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-a3899220f90e svadmin-u-918184635b1d"
      role="img"
      aria-label={`${numericValue} out of ${normalizedMax}`}
    >
      {#each stars as starType, idx (idx)}
        {#if starType === 'full'}
          <Star aria-hidden="true" class={cn(sizeClasses[size].icon, 'svadmin-u-d633790a1397 svadmin-u-918184635b1d')} />
        {:else if starType === 'half'}
          <StarHalf aria-hidden="true" class={cn(sizeClasses[size].icon, 'svadmin-u-d633790a1397 svadmin-u-918184635b1d')} />
        {:else}
          <Star aria-hidden="true" class={cn(sizeClasses[size].icon, 'svadmin-u-106b502aac96')} />
        {/if}
      {/each}
    </div>
    {#if showValue}
      <span class={cn('svadmin-u-3032cae0badb svadmin-u-2689f3958069 svadmin-u-d4108abe6359', sizeClasses[size].text)}>
        {numericValue}
      </span>
    {/if}
  </div>
{/if}
