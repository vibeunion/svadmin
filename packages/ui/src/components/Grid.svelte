<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  type Gap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

  interface Props {
    columns?: number | 'auto';
    minItemWidth?: string;
    smColumns?: number | 'auto';
    mdColumns?: number | 'auto';
    lgColumns?: number | 'auto';
    xlColumns?: number | 'auto';
    gap?: Gap;
    align?: 'start' | 'center' | 'end' | 'stretch';
    class?: string;
    children?: Snippet;
  }

  let {
    columns = 'auto',
    minItemWidth = '12rem',
    smColumns,
    mdColumns,
    lgColumns,
    xlColumns,
    gap = 'md',
    align = 'stretch',
    class: className = '',
    children,
  }: Props = $props();

  const gapValue = $derived(typeof gap === 'number' ? `${gap}px` : `var(--svadmin-space-${gap === 'xs' ? '1' : gap === 'sm' ? '2' : gap === 'md' ? '3' : gap === 'lg' ? '4' : '5'})`);
  const templateFor = (value: number | 'auto'): string => value === 'auto' ? `repeat(auto-fit, minmax(min(100%, ${minItemWidth}), 1fr))` : `repeat(${value}, minmax(0, 1fr))`;
  const style = $derived([
    `--svadmin-grid-columns:${templateFor(columns)}`,
    `--svadmin-grid-sm-columns:${templateFor(smColumns ?? columns)}`,
    `--svadmin-grid-md-columns:${templateFor(mdColumns ?? smColumns ?? columns)}`,
    `--svadmin-grid-lg-columns:${templateFor(lgColumns ?? mdColumns ?? smColumns ?? columns)}`,
    `--svadmin-grid-xl-columns:${templateFor(xlColumns ?? lgColumns ?? mdColumns ?? smColumns ?? columns)}`,
  ].filter(Boolean).join(';'));
  const alignMap = { start: 'start', center: 'center', end: 'end', stretch: 'stretch' } as const;
</script>

<div class={cn('svadmin-grid', className)} {style} style:gap={gapValue} style:align-items={alignMap[align]}>
  {@render children?.()}
</div>

<style>
  .svadmin-grid { display: grid; min-width: 0; grid-template-columns: var(--svadmin-grid-columns, repeat(auto-fit, minmax(min(100%, 12rem), 1fr))); }
  @media (min-width: 40rem) { .svadmin-grid { grid-template-columns: var(--svadmin-grid-sm-columns, var(--svadmin-grid-columns)); } }
  @media (min-width: 48rem) { .svadmin-grid { grid-template-columns: var(--svadmin-grid-md-columns, var(--svadmin-grid-sm-columns, var(--svadmin-grid-columns))); } }
  @media (min-width: 64rem) { .svadmin-grid { grid-template-columns: var(--svadmin-grid-lg-columns, var(--svadmin-grid-md-columns, var(--svadmin-grid-sm-columns, var(--svadmin-grid-columns)))); } }
  @media (min-width: 80rem) { .svadmin-grid { grid-template-columns: var(--svadmin-grid-xl-columns, var(--svadmin-grid-lg-columns, var(--svadmin-grid-md-columns, var(--svadmin-grid-sm-columns, var(--svadmin-grid-columns))))); } }
</style>
