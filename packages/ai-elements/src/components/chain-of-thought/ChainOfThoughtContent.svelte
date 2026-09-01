<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import { useChainOfThoughtContext } from './context.svelte.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
  const context = useChainOfThoughtContext();
</script>
{#if context.open}
  <div id={context.contentId} class={cn('mt-2 space-y-3 text-foreground', className)} data-state="open" {...rest}>{@render children?.()}</div>
{/if}
