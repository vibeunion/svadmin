<script lang="ts">
  import { NodeToolbar, Position } from '@xyflow/svelte';
  import type { NodeToolbarProps } from '@xyflow/svelte';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<NodeToolbarProps, 'class'> & { class?: ClassValue; children?: Snippet };
  let { position = Position.Bottom, class: className, children, ...rest }: Props = $props();
</script>

<NodeToolbar
  {position}
  class={cn('svadmin-ai svadmin-ai-toolbar', className)}
  data-slot="toolbar"
  {...rest}
>
  {@render children?.()}
</NodeToolbar>

<style>
  :global(.svadmin-ai-toolbar.svelte-flow__node-toolbar) {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.375rem);
    background: var(--background, transparent);
    color: var(--foreground, currentColor);
  }
</style>
