<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    primary: Snippet;
    secondary?: Snippet;
    summary?: Snippet;
    secondaryWidth?: string;
    class?: string;
  }

  let {
    primary,
    secondary,
    summary,
    secondaryWidth = '22rem',
    class: className = '',
  }: Props = $props();
</script>

<div class={cn('flex flex-col gap-6', className)} data-svadmin-workspace-layout style:--workspace-secondary-width={secondaryWidth}>
  {#if summary}<div class="order-2 sm:order-1">{@render summary()}</div>{/if}
  <div class="order-1 grid min-w-0 gap-6 sm:order-2 lg:grid-cols-[minmax(0,1fr)_var(--workspace-secondary-width)]">
    <div class="min-w-0" data-svadmin-workspace-primary>{@render primary()}</div>
    {#if secondary}<aside class="min-w-0">{@render secondary()}</aside>{/if}
  </div>
</div>
