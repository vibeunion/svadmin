<script lang="ts">
  import { BaseEdge, getBezierPath, Position, useInternalNode } from '@xyflow/svelte';
  import type { InternalNode } from '@xyflow/svelte';
  import type { EdgeProps } from '@xyflow/svelte';
  import { untrack } from 'svelte';

  type Props = EdgeProps & {
    sourceNode?: InternalNode;
    targetNode?: InternalNode;
  };

  let {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    markerStart,
    markerEnd,
    style,
    label,
    labelStyle,
    interactionWidth,
    sourceNode: providedSourceNode,
    targetNode: providedTargetNode,
  }: Props = $props();

  let sourceNodeStore: ReturnType<typeof useInternalNode> | undefined;
  let targetNodeStore: ReturnType<typeof useInternalNode> | undefined;
  try {
    sourceNodeStore = useInternalNode(untrack(() => source));
    targetNodeStore = useInternalNode(untrack(() => target));
  } catch {
    sourceNodeStore = undefined;
    targetNodeStore = undefined;
  }

  const sourceNode = $derived(providedSourceNode ?? sourceNodeStore?.current);
  const targetNode = $derived(providedTargetNode ?? targetNodeStore?.current);

  function handleCoords(node: InternalNode, position: Position): readonly [number, number] {
    const type = position === Position.Left ? 'target' : 'source';
    const handle = node.internals.handleBounds?.[type]?.find((item) => item.position === position);
    if (!handle) {
      const bounds = node.internals.positionAbsolute;
      return [bounds.x + (position === Position.Right ? (node.measured.width ?? 0) : 0), bounds.y + (position === Position.Bottom ? (node.measured.height ?? 0) : 0)];
    }

    const offsetX = position === Position.Left ? 0 : position === Position.Right ? handle.width : handle.width / 2;
    const offsetY = position === Position.Top ? 0 : position === Position.Bottom ? handle.height : handle.height / 2;
    return [node.internals.positionAbsolute.x + handle.x + offsetX, node.internals.positionAbsolute.y + handle.y + offsetY];
  }

  const edgeGeometry = $derived.by(() => {
    if (sourceNode && targetNode) {
      const [sx, sy] = handleCoords(sourceNode, Position.Right);
      const [tx, ty] = handleCoords(targetNode, Position.Left);
      return getBezierPath({ sourceX: sx, sourceY: sy, sourcePosition: Position.Right, targetX: tx, targetY: ty, targetPosition: Position.Left });
    }
    return getBezierPath({ sourceX, sourceY, sourcePosition: Position.Right, targetX, targetY, targetPosition: Position.Left });
  });
  const path = $derived(edgeGeometry[0]);
  const computedLabelX = $derived(edgeGeometry[1]);
  const computedLabelY = $derived(edgeGeometry[2]);
</script>

<BaseEdge
  {id}
  {path}
  {label}
  labelX={computedLabelX}
  labelY={computedLabelY}
  {labelStyle}
  {interactionWidth}
  {markerStart}
  {markerEnd}
  {style}
  class="svadmin-ai-edge-animated"
/>

<circle class="svadmin-ai-edge-animated__marker" fill="var(--primary, currentColor)" r="4">
  <animateMotion dur="2s" path={path} repeatCount="indefinite" />
</circle>

<style>
  :global(.svadmin-ai-edge-animated) { stroke: var(--border, currentColor); }
  .svadmin-ai-edge-animated__marker { pointer-events: none; }
  @media (prefers-reduced-motion: reduce) {
    .svadmin-ai-edge-animated__marker animateMotion { display: none; }
  }
</style>
