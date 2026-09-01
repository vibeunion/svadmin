<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { completed?: boolean; class?: string; children?: Snippet; }
  let { completed = false, class: className = '', children, ...rest }: Props = $props();
</script>
<div {...rest} class={cn('svadmin-ai-task-part__item', completed && 'svadmin-ai-task-part__item--complete', className)} data-slot="task-item">{@render children?.()}</div>
<style>.svadmin-ai-task-part__item { color: var(--muted-foreground, currentColor); font-size: .82rem; line-height: 1.45; }.svadmin-ai-task-part__item--complete { text-decoration: line-through; opacity: .65; }</style>
