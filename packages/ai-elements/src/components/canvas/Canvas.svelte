<script lang="ts" generics="NodeType extends Node = Node, EdgeType extends Edge = Edge">
  import { Background, SvelteFlow } from '@xyflow/svelte';
  import type { BackgroundProps, Edge, Node, SvelteFlowProps } from '@xyflow/svelte';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import '@xyflow/svelte/dist/style.css';

  type Props = SvelteFlowProps<NodeType, EdgeType> & {
    children?: Snippet;
    class?: ClassValue;
    background?: BackgroundProps;
  };

  let {
    children,
    nodes = $bindable<NodeType[]>([]),
    edges = $bindable<EdgeType[]>([]),
    viewport = $bindable(),
    deleteKey = ['Backspace', 'Delete'],
    fitView = true,
    panOnDrag = false,
    panOnScroll = true,
    selectionOnDrag = true,
    zoomOnDoubleClick = false,
    background = {},
    class: className,
    ...rest
  }: Props = $props();
</script>

<SvelteFlow
  bind:nodes
  bind:edges
  bind:viewport
  {deleteKey}
  {fitView}
  {panOnDrag}
  {panOnScroll}
  {selectionOnDrag}
  {zoomOnDoubleClick}
  class={cn('svadmin-ai svadmin-ai-canvas', className)}
  data-slot="canvas"
  {...rest}
>
  <Background
    bgColor="var(--sidebar, var(--muted, transparent))"
    patternColor="var(--border, currentColor)"
    {...background}
  />
  {@render children?.()}
</SvelteFlow>

<style>
  :global(.svadmin-ai-canvas.svelte-flow) {
    min-width: 0;
    min-height: 12rem;
    color: var(--foreground, currentColor);
    --xy-background-color: var(--sidebar, var(--muted, transparent));
    --xy-background-pattern-dots-color-default: var(--border, currentColor);
    --xy-edge-stroke-default: var(--border, currentColor);
    --xy-edge-stroke-selected-default: var(--primary, currentColor);
    --xy-connectionline-stroke-default: var(--ring, currentColor);
    --xy-node-color-default: var(--card-foreground, var(--foreground, currentColor));
    --xy-node-border-default: 1px solid var(--border, currentColor);
    --xy-node-background-color-default: var(--card, var(--background, transparent));
    --xy-handle-background-color-default: var(--primary, currentColor);
    --xy-handle-border-color-default: var(--background, transparent);
    --xy-selection-background-color-default: color-mix(in oklch, var(--primary, currentColor) 10%, transparent);
    --xy-selection-border-default: 1px dotted var(--primary, currentColor);
    --xy-controls-button-background-color-default: var(--card, var(--background, transparent));
    --xy-controls-button-background-color-hover-default: var(--secondary, var(--muted, transparent));
    --xy-controls-button-color-default: var(--foreground, currentColor);
    --xy-controls-button-color-hover-default: var(--foreground, currentColor);
    --xy-controls-button-border-color-default: var(--border, currentColor);
  }
</style>
