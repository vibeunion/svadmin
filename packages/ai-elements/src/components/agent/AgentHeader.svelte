<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Bot } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  let { name, model, class: className = '', children, ...rest }: { name: string; model?: string; class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>

<div class={cn('flex w-full items-center justify-between gap-4 p-3', className)} {...rest}>
  <div class="flex min-w-0 items-center gap-2">
    <Bot class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span class="truncate text-sm font-medium">{name}</span>
    {#if model}<span class="truncate rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{model}</span>{/if}
  </div>
  {@render children?.()}
</div>
