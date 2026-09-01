<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { sourceHostname, useInlineCitationCard } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { sources: string[]; class?: string; children?: Snippet<[string[], string]>; }
  let { sources, class: className = '', children, onclick, ...rest }: Props = $props(); const card = useInlineCitationCard(); const hostname = $derived(sourceHostname(sources[0]));
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) card.setOpen(!card.open); }
</script>
<button {...rest} type="button" class={cn('ml-1 inline-flex min-h-6 items-center rounded-full bg-muted px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring', className)} aria-label={rest['aria-label'] ?? `${hostname}${sources.length > 1 ? ` +${sources.length - 1}` : ''}`} aria-haspopup="dialog" aria-expanded={card.open} data-slot="inline-citation-card-trigger" onclick={click}>{#if children}{@render children(sources, hostname)}{:else}{hostname}{#if sources.length > 1} +{sources.length - 1}{/if}{/if}</button>
