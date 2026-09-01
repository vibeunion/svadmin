<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { Snippet } from 'svelte';
  import type { ClassValue, HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  export interface NodeHandles {
    target?: boolean;
    source?: boolean;
  }

  export type NodeComponentProps = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & {
    handles?: NodeHandles;
    class?: ClassValue;
    children?: Snippet;
    data?: Record<string, unknown>;
    id?: string;
    type?: string;
  };

  let {
    handles = {},
    class: className,
    children,
    ...rest
  }: NodeComponentProps = $props();
</script>

<div
  {...rest}
  class={cn('svadmin-ai svadmin-ai-node', className)}
  data-slot="node"
>
  {#if handles.target}
    <Handle type="target" position={Position.Left} />
  {/if}
  {#if handles.source}
    <Handle type="source" position={Position.Right} />
  {/if}
  {@render children?.()}
</div>

<style>
  .svadmin-ai-node {
    position: relative;
    display: grid;
    width: min(20rem, 100%);
    min-width: 12rem;
    height: auto;
    gap: 0;
    overflow: visible;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.5rem);
    background: var(--card, var(--background, transparent));
    color: var(--card-foreground, var(--foreground, currentColor));
    box-shadow: 0 1px 2px color-mix(in oklch, var(--foreground, currentColor) 7%, transparent);
  }

  :global(.svadmin-ai-node .svelte-flow__handle) {
    width: 0.625rem;
    height: 0.625rem;
    border: 2px solid var(--background, transparent);
    background: var(--primary, currentColor);
  }
</style>
