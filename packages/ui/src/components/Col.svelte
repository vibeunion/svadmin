<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    span?: number;
    offset?: number;
    xs?: number;
    xsOffset?: number;
    sm?: number;
    smOffset?: number;
    md?: number;
    mdOffset?: number;
    lg?: number;
    lgOffset?: number;
    xl?: number;
    xlOffset?: number;
    order?: number;
    class?: string;
    children?: Snippet;
  }

  let {
    span = 24,
    offset = 0,
    xs,
    xsOffset,
    sm,
    smOffset,
    md,
    mdOffset,
    lg,
    lgOffset,
    xl,
    xlOffset,
    order,
    class: className = '',
    children,
  }: Props = $props();

  const safeSpan = (value: number): number => Math.max(1, Math.min(24, value));
  const safeStart = (value: number | undefined): string => value === undefined || value <= 0 ? 'auto' : `${Math.min(24, value + 1)}`;
  const style = $derived([
    `--svadmin-col-span:${safeSpan(xs ?? span)}`,
    `--svadmin-col-start:${safeStart(xsOffset ?? offset)}`,
    `--svadmin-col-sm:${safeSpan(sm ?? xs ?? span)}`,
    `--svadmin-col-sm-start:${safeStart(smOffset ?? xsOffset ?? offset)}`,
    `--svadmin-col-md:${safeSpan(md ?? sm ?? xs ?? span)}`,
    `--svadmin-col-md-start:${safeStart(mdOffset ?? smOffset ?? xsOffset ?? offset)}`,
    `--svadmin-col-lg:${safeSpan(lg ?? md ?? sm ?? xs ?? span)}`,
    `--svadmin-col-lg-start:${safeStart(lgOffset ?? mdOffset ?? smOffset ?? xsOffset ?? offset)}`,
    `--svadmin-col-xl:${safeSpan(xl ?? lg ?? md ?? sm ?? xs ?? span)}`,
    `--svadmin-col-xl-start:${safeStart(xlOffset ?? lgOffset ?? mdOffset ?? smOffset ?? xsOffset ?? offset)}`,
  ].filter(Boolean).join(';'));
</script>

<div class={cn('svadmin-col', className)} {style} style:order={order ?? null}>
  {@render children?.()}
</div>

<style>
  .svadmin-col {
    min-width: 0;
    grid-column: var(--svadmin-col-start, auto) / span var(--svadmin-col-span, 24);
  }
  @media (min-width: 40rem) {
    .svadmin-col { grid-column: var(--svadmin-col-sm-start, var(--svadmin-col-start, auto)) / span var(--svadmin-col-sm, var(--svadmin-col-span, 24)); }
  }
  @media (min-width: 48rem) {
    .svadmin-col { grid-column: var(--svadmin-col-md-start, var(--svadmin-col-sm-start, var(--svadmin-col-start, auto))) / span var(--svadmin-col-md, var(--svadmin-col-sm, var(--svadmin-col-span, 24))); }
  }
  @media (min-width: 64rem) {
    .svadmin-col { grid-column: var(--svadmin-col-lg-start, var(--svadmin-col-md-start, var(--svadmin-col-sm-start, var(--svadmin-col-start, auto)))) / span var(--svadmin-col-lg, var(--svadmin-col-md, var(--svadmin-col-sm, var(--svadmin-col-span, 24)))); }
  }
  @media (min-width: 80rem) {
    .svadmin-col { grid-column: var(--svadmin-col-xl-start, var(--svadmin-col-lg-start, var(--svadmin-col-md-start, var(--svadmin-col-sm-start, var(--svadmin-col-start, auto))))) / span var(--svadmin-col-xl, var(--svadmin-col-lg, var(--svadmin-col-md, var(--svadmin-col-sm, var(--svadmin-col-span, 24))))); }
  }
</style>
