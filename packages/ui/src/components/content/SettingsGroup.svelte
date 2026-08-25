<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    children: Snippet;
    class?: string;
    bodyClass?: string;
  }

  let {
    title,
    description,
    actions,
    children,
    class: className = '',
    bodyClass = '',
  }: Props = $props();
</script>

<section class={cn('overflow-hidden rounded-lg border border-border bg-card shadow-sm', className)} data-svadmin-settings-group>
  <header class="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0 space-y-1">
      <h2 class="text-sm font-semibold text-foreground">{title}</h2>
      {#if description}<p class="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>{/if}
    </div>
    {#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>{/if}
  </header>
  <div class={cn('p-5', bodyClass)}>{@render children()}</div>
</section>
