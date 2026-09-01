<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useTaskContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
  const task = useTaskContext('TaskContent');
</script>
{#if task.open}<div {...rest} class={cn('svadmin-ai-task-part__content', className)} data-slot="task-content">{@render children?.()}</div>{/if}
<style>.svadmin-ai-task-part__content { display: grid; gap: .5rem; border-left: 2px solid var(--border, currentColor); padding: .5rem 0 .5rem .75rem; }</style>
