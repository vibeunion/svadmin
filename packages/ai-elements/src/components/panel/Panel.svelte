<script lang="ts">
  import { Panel as PanelPrimitive } from '@xyflow/svelte';
  import type { PanelProps } from '@xyflow/svelte';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<PanelProps, 'class'> & { class?: ClassValue; children?: Snippet };
  let { position = 'top-right', class: className, children, ...rest }: Props = $props();
</script>

<PanelPrimitive
  {position}
  class={cn('svadmin-ai svadmin-ai-panel', className)}
  data-slot="panel"
  {...rest}
>
  {@render children?.()}
</PanelPrimitive>

<style>
  :global(.svadmin-ai-panel.svelte-flow__panel) {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow: hidden;
    margin: 1rem;
    padding: 0.25rem;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.5rem);
    background: var(--card, var(--background, transparent));
    color: var(--card-foreground, var(--foreground, currentColor));
  }
</style>
