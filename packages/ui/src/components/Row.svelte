<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  type Gutter = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

  interface Props {
    gutter?: Gutter | [Gutter, Gutter];
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
    class?: string;
    children?: Snippet;
  }

  let { gutter = 'md', align = 'stretch', justify = 'start', class: className = '', children }: Props = $props();

  const gapValue = (value: Gutter): string => typeof value === 'number' ? `${value}px` : `var(--svadmin-space-${value === 'xs' ? '1' : value === 'sm' ? '2' : value === 'md' ? '3' : value === 'lg' ? '4' : '5'})`;
  const columnGap = $derived(Array.isArray(gutter) ? gapValue(gutter[0]) : gapValue(gutter));
  const rowGap = $derived(Array.isArray(gutter) ? gapValue(gutter[1]) : gapValue(gutter));
  const alignMap = { start: 'start', center: 'center', end: 'end', stretch: 'stretch' } as const;
  const justifyMap = { start: 'start', center: 'center', end: 'end', between: 'space-between', around: 'space-around' } as const;
</script>

<div
  class={cn('svadmin-row', className)}
  style:column-gap={columnGap}
  style:row-gap={rowGap}
  style:align-items={alignMap[align]}
  style:justify-content={justifyMap[justify]}
>
  {@render children?.()}
</div>

<style>
  .svadmin-row {
    display: grid;
    grid-template-columns: repeat(24, minmax(0, 1fr));
    width: 100%;
    min-width: 0;
  }
</style>