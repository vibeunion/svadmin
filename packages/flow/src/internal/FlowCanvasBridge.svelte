<script lang="ts" generics="NodeType extends Node = Node, EdgeType extends Edge = Edge">
  import { useSvelteFlow } from '@xyflow/svelte';
  import type { Edge, Node } from '@xyflow/svelte';
  import type { FlowCanvasApi } from '../types.js';

  let { onready }: { onready: (api: FlowCanvasApi) => void } = $props();

  const instance = useSvelteFlow<NodeType, EdgeType>();

  $effect(() => {
    onready({
      fitView: () => instance.fitView(),
      screenToFlowPosition: instance.screenToFlowPosition,
    });
  });
</script>
