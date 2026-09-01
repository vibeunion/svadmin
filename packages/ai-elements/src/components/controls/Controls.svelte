<script lang="ts">
  import { Controls as ControlsPrimitive } from '@xyflow/svelte';
  import type { ControlsProps } from '@xyflow/svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<ControlsProps, 'class'> & { class?: ClassValue };
  let { class: className, ...rest }: Props = $props();
</script>

<ControlsPrimitive
  class={cn('svadmin-ai svadmin-ai-controls', className)}
  data-slot="controls"
  {...rest}
/>

<style>
  :global(.svadmin-ai-controls.svelte-flow__controls) {
    display: flex;
    gap: 1px;
    overflow: hidden;
    padding: 0.25rem;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.5rem);
    background: var(--card, var(--background, transparent));
    box-shadow: none;
  }

  :global(.svadmin-ai-controls.svelte-flow__controls button) {
    border: 0;
    border-radius: min(var(--radius, 0.5rem), 0.375rem);
    background: transparent;
    color: var(--foreground, currentColor);
  }

  :global(.svadmin-ai-controls.svelte-flow__controls button:hover:not(:disabled)) {
    background: var(--secondary, var(--muted, transparent));
  }

  :global(.svadmin-ai-controls.svelte-flow__controls button:focus-visible) {
    outline: 2px solid var(--ring, currentColor);
    outline-offset: -2px;
  }
</style>
