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
  class={cn('svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-0d304f904cb0', className)}
  data-svadmin-workspace-layout
  data-secondary-collapsed={secondaryCollapsed}
  style:--workspace-secondary-width={resolvedSecondaryWidth}
>
  {#if summary}<div data-svadmin-workspace-summary>{@render summary()}</div>{/if}
  <div class={cn('svadmin-u-f3c543ad5fe9 svadmin-u-7e0b7cdf1a94 svadmin-u-60541e1e26f8 svadmin-u-0d304f904cb0 svadmin-u-febbcd95bf06', mobileOrder === 'secondary-first' && 'svadmin-u-dfb5e722be57')}>
    {#if mobileOrder === 'secondary-first' && secondary}<aside class="svadmin-u-ea37b42b1c3b svadmin-u-7e0b7cdf1a94 svadmin-u-2c1f5e2b6a5b">{@render secondary()}</aside>{/if}
    <div class={cn('svadmin-u-7e0b7cdf1a94', mobileOrder === 'secondary-first' ? 'svadmin-u-ef72121aca75 svadmin-u-831f8770959d' : 'svadmin-u-ea37b42b1c3b')} data-svadmin-workspace-primary>{@render primary()}</div>
    {#if mobileOrder !== 'secondary-first' && secondary}<aside class="svadmin-u-ef72121aca75 svadmin-u-7e0b7cdf1a94 svadmin-u-2c1f5e2b6a5b">{@render secondary()}</aside>{/if}
  </div>
</div>
