<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  type SpaceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

  interface Props {
    direction?: 'horizontal' | 'vertical';
    size?: SpaceSize;
    align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    wrap?: boolean;
    inline?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    direction = 'horizontal',
    size = 'sm',
    align = 'center',
    justify = 'start',
    wrap = false,
    inline = false,
    class: className = '',
    children,
  }: Props = $props();

  const gap = $derived(typeof size === 'number' ? `${size}px` : `var(--svadmin-space-${size === 'xs' ? '1' : size === 'sm' ? '2' : size === 'md' ? '3' : size === 'lg' ? '4' : '5'})`);
  const alignMap = { start: 'flex-start', center: 'center', end: 'flex-end', baseline: 'baseline', stretch: 'stretch' } as const;
  const justifyMap = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around', evenly: 'space-evenly' } as const;
</script>

<div
  class={cn('svadmin-space', className)}
  data-direction={direction}
  data-inline={inline ? 'true' : 'false'}
  style:--svadmin-space-gap={gap}
  style:align-items={alignMap[align]}
  style:justify-content={justifyMap[justify]}
  style:flex-wrap={wrap ? 'wrap' : 'nowrap'}
>
  {@render children?.()}
</div>

<style>
  .svadmin-space {
    display: flex;
    min-width: 0;
    gap: var(--svadmin-space-gap);
  }
  .svadmin-space[data-direction='vertical'] {
    flex-direction: column;
  }
  .svadmin-space[data-inline='true'] {
    display: inline-flex;
  }
</style>