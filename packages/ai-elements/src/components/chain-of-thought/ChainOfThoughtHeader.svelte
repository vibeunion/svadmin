<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Brain, ChevronDown } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useChainOfThoughtContext } from './context.svelte.js';
  let { class: className = '', children, onclick, ...rest }: { class?: string; children?: Snippet; onclick?: (event: MouseEvent) => void; [key: string]: unknown } = $props();
  const context = useChainOfThoughtContext();
</script>
<button
  type="button"
  class={cn('flex w-full items-center gap-2 border-0 bg-transparent p-0 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', className)}
  aria-expanded={context.open}
  aria-controls={context.contentId}
  onclick={(event) => { context.setOpen(!context.open); onclick?.(event); }}
  {...rest}
>
  <Brain class="size-4 shrink-0" aria-hidden="true" />
  <span class="flex-1 text-left">{#if children}{@render children()}{:else}Chain of Thought{/if}</span>
  <ChevronDown class={cn('size-4 shrink-0 transition-transform', context.open && 'rotate-180')} aria-hidden="true" />
</button>
