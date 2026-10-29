<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  type Gap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

  interface Props {
    columns?: number | 'auto';
    minItemWidth?: string;
    gap?: Gap;
    align?: 'start' | 'center' | 'end' | 'stretch';
    class?: string;
    children?: Snippet;
  }

  let {
    columns = 'auto',
    minItemWidth = '12rem',
    gap = 'md',
    align = 'stretch',
    class: className = '',
    children,
  }: Props = $props();

  const gapValue = $derived(typeof gap === 'number' ? `${gap}px` : `var(--svadmin-space-${gap === 'xs' ? '1' : gap === 'sm' ? '2' : gap === 'md' ? '3' : gap === 'lg' ? '4' : '5'})`);
  const template = $derived(columns === 'auto' ? `repeat(auto-fit, minmax(min(100%, ${minItemWidth}), 1fr))` : `repeat(${columns}, minmax(0, 1fr))`);
  const alignMap = { start: 'start', center: 'center', end: 'end', stretch: 'stretch' } as const;
</script>

<div
  class={cn('svadmin-grid', className)}
  style:grid-template-columns={template}
  style:gap={gapValue}
  style:align-items={alignMap[align]}
>
  {@render children?.()}
</div>

<style>
  .svadmin-grid {
    display: grid;
    min-width: 0;
  }
</style>