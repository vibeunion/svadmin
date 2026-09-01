<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { useInlineCitationCard } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props(); const card = useInlineCitationCard();
</script>
{#if card.open}<div {...rest} class={cn('absolute bottom-full left-1/2 z-40 mb-2 w-80 -translate-x-1/2 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md', className)} role="dialog" aria-label={rest['aria-label'] ?? 'Citation sources'} data-slot="inline-citation-card-body">{@render children?.()}</div>{/if}
