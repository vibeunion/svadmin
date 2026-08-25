<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    id?: string;
    class?: string;
  }
  let { title, description, actions, id, class: className = '' }: Props = $props();
</script>

<div class={'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ' + className}>
  <div class="min-w-0 space-y-1">
    <h2 {id} class="text-base font-semibold text-foreground">{title}</h2>
    {#if description}<p class="text-sm text-muted-foreground">{description}</p>{/if}
  </div>
  {#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>{/if}
</div>
