<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { completed?: boolean; class?: string; children?: Snippet; }
  let { completed = false, class: className = '', children, ...rest }: Props = $props();
</script>
<span {...rest} class={cn('svadmin-ai-queue-part__content', completed && 'svadmin-ai-queue-part__content--complete', className)} data-slot="queue-item-content">{@render children?.()}</span>
<style>.svadmin-ai-queue-part__content { min-width: 0; flex: 1; overflow-wrap: anywhere; color: var(--muted-foreground, currentColor); }.svadmin-ai-queue-part__content--complete { text-decoration: line-through; opacity: .55; }</style>
