<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    primary: Snippet;
    secondary?: Snippet;
    summary?: Snippet;
    secondaryWidth?: string;
    secondaryCollapsed?: boolean;
    secondaryCollapsedWidth?: string;
    mobileOrder?: 'primary-first' | 'secondary-first';
    class?: string;
  }

  let {
    primary,
    secondary,
    summary,
    secondaryWidth = '22rem',
    secondaryCollapsed = false,
    secondaryCollapsedWidth = '3rem',
    mobileOrder = 'primary-first',
    class: className = '',
  }: Props = $props();

  const resolvedSecondaryWidth = $derived(secondaryCollapsed ? secondaryCollapsedWidth : secondaryWidth);
</script>

<div
  class={cn('flex flex-col gap-6', className)}
  data-svadmin-workspace-layout
  data-secondary-collapsed={secondaryCollapsed}
  style:--workspace-secondary-width={resolvedSecondaryWidth}
>
  {#if summary}<div data-svadmin-workspace-summary>{@render summary()}</div>{/if}
  <div class={cn('grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_var(--workspace-secondary-width)]', mobileOrder === 'secondary-first' && 'grid-rows-[auto_auto]')}>
    {#if mobileOrder === 'secondary-first' && secondary}<aside class="order-1 min-w-0 xl:order-2">{@render secondary()}</aside>{/if}
    <div class={cn('min-w-0', mobileOrder === 'secondary-first' ? 'order-2 xl:order-1' : 'order-1')} data-svadmin-workspace-primary>{@render primary()}</div>
    {#if mobileOrder !== 'secondary-first' && secondary}<aside class="order-2 min-w-0 xl:order-2">{@render secondary()}</aside>{/if}
  </div>
</div>
