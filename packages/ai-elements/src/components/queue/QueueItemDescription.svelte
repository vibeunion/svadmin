<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { completed?: boolean; class?: string; children?: Snippet; }
  let { completed = false, class: className = '', children, ...rest }: Props = $props();
</script>
<div {...rest} class={cn('svadmin-ai-queue-part__description', completed && 'svadmin-ai-queue-part__description--complete', className)} data-slot="queue-item-description">{@render children?.()}</div>
<style>.svadmin-ai-queue-part__description { padding-left: 1.35rem; color: var(--muted-foreground, currentColor); font-size: .75rem; line-height: 1.45; }.svadmin-ai-queue-part__description--complete { text-decoration: line-through; opacity: .5; }</style>
