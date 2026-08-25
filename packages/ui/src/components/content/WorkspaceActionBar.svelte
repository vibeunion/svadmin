<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  interface Props {
    title: string;
    description?: string;
    status?: string;
    primaryAction: Snippet;
    secondaryActions?: Snippet;
    class?: string;
  }

  let { title, description, status, primaryAction, secondaryActions, class: className = '' }: Props = $props();
</script>

<section
  class={cn('flex flex-col gap-3 border-y border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between', className)}
  aria-label={title}
  data-svadmin-workspace-action-bar
>
  <div class="min-w-0">
    <div class="flex flex-wrap items-center gap-2">
      {#if status}<span class="rounded-sm bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">{status}</span>{/if}
      <h2 class="text-sm font-semibold text-foreground">{title}</h2>
    </div>
    {#if description}<p class="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>{/if}
  </div>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    {#if secondaryActions}{@render secondaryActions()}{/if}
    {@render primaryAction()}
  </div>
</section>
