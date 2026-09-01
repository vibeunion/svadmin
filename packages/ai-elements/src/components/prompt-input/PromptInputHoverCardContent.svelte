<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { usePromptInputHoverCard } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props(); const card = usePromptInputHoverCard();
</script>
{#if card.open}<div {...rest} class={cn('absolute bottom-full left-0 z-30 mb-2 w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md', className)} role="dialog" data-slot="prompt-input-hover-card-content">{@render children?.()}</div>{/if}
