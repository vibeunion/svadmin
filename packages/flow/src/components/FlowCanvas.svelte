<script lang="ts" generics="NodeType extends Node = Node, EdgeType extends Edge = Edge">
  import { Background, Controls, MiniMap, SvelteFlow } from '@xyflow/svelte';
  import type { Edge, Node, NodeEvents } from '@xyflow/svelte';
  import type { Snippet } from 'svelte';
  import FlowCanvasBridge from '../internal/FlowCanvasBridge.svelte';
  import { FLOW_PALETTE_MIME_TYPE, readFlowPaletteItem } from '../flow-dnd.js';
  import type { EdgeTypes, FlowCanvasApi, FlowItemDropDetail, NodeTypes, OnConnect } from '../types.js';

  type Props = {
    nodes?: NodeType[];
    edges?: EdgeType[];
    nodeTypes?: NodeTypes;
    edgeTypes?: EdgeTypes;
    fitView?: boolean;
    minZoom?: number;
    maxZoom?: number;
    interactive?: boolean;
    showBackground?: boolean;
    showControls?: boolean;
    showMiniMap?: boolean;
    class?: string;
    ariaLabel?: string;
    onconnect?: OnConnect;
    onnodeclick?: NodeEvents<NodeType>['onnodeclick'];
    onitemdrop?: (detail: FlowItemDropDetail) => void;
    onready?: (api: FlowCanvasApi) => void;
    children?: Snippet;
  };

  let {
    nodes = $bindable<NodeType[]>([]),
    edges = $bindable<EdgeType[]>([]),
    nodeTypes,
    edgeTypes,
    fitView = true,
    minZoom,
    maxZoom,
    interactive = true,
    showBackground = true,
    showControls = true,
    showMiniMap = false,
    class: className = '',
    ariaLabel = 'Flow canvas',
    onconnect,
    onnodeclick,
    onitemdrop,
    onready,
    children,
  }: Props = $props();

  let canvasApi: FlowCanvasApi | undefined;

  function receiveApi(nextApi: FlowCanvasApi) {
    canvasApi = nextApi;
    onready?.(nextApi);
  }

  function allowPaletteDrop(event: DragEvent) {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes(FLOW_PALETTE_MIME_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function emitPaletteDrop(event: DragEvent) {
    const paletteTemplate = readFlowPaletteItem(event.dataTransfer);
    if (!paletteTemplate || !canvasApi) return;

    event.preventDefault();
    onitemdrop?.({
      template: paletteTemplate,
      position: canvasApi.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      event,
    });
  }
</script>

<SvelteFlow
  bind:nodes
  bind:edges
  {nodeTypes}
  {edgeTypes}
  {fitView}
  {minZoom}
  {maxZoom}
  nodesDraggable={interactive}
  nodesConnectable={interactive}
  elementsSelectable={interactive}
  class={['svadmin-flow-canvas', className]}
  aria-label={ariaLabel}
  {onconnect}
  {onnodeclick}
  ondragover={allowPaletteDrop}
  ondrop={emitPaletteDrop}
>
  <FlowCanvasBridge onready={receiveApi} />
  {#if showBackground}
    <Background />
  {/if}
  {#if showControls}
    <Controls showLock={false} />
  {/if}
  {#if showMiniMap}
    <MiniMap />
  {/if}
  {@render children?.()}
</SvelteFlow>
