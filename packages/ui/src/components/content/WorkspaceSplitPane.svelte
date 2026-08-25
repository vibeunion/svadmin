<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    primary: Snippet;
    secondary: Snippet;
    secondaryWidth?: string;
    reverse?: boolean;
    class?: string;
  }

  let {
    primary,
    secondary,
    secondaryWidth = '42%',
    reverse = false,
    class: className = '',
  }: Props = $props();
</script>

<div
  class={cn(
    'grid min-w-0 overflow-hidden rounded-lg border border-border bg-card',
    reverse ? 'lg:grid-cols-[var(--workspace-split-width)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)_var(--workspace-split-width)]',
    className,
  )}
  style:--workspace-split-width={secondaryWidth}
  data-svadmin-workspace-split-pane
  data-reverse={reverse}
>
  <section class={cn('min-w-0 p-4', reverse && 'lg:order-2')} data-svadmin-split-primary>{@render primary()}</section>
  <section class={cn('min-w-0 border-t border-border bg-muted/15 p-4 lg:border-l lg:border-t-0', reverse && 'lg:order-1 lg:border-l-0 lg:border-r')} data-svadmin-split-secondary>{@render secondary()}</section>
</div>
