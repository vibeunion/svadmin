<script lang="ts">
  import { BaseEdge, getBezierPath } from '@xyflow/svelte';
  import type { EdgeProps } from '@xyflow/svelte';

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    labelStyle,
    interactionWidth,
    markerStart,
    markerEnd,
  }: EdgeProps = $props();

  const [path, computedLabelX, computedLabelY] = $derived(
    getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.25,
    }),
  );
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
  class="svadmin-ai-edge-temporary"
  style="stroke-dasharray: 5, 5"
/>

<style>
  :global(.svadmin-ai-edge-temporary) {
    stroke: var(--ring, currentColor);
    stroke-width: 1;
  }
</style>
