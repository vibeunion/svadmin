<script lang="ts">
  import { useConnection } from '@xyflow/svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '../../utils.js';

  export interface ConnectionLineProps {
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;
    sourceX?: number;
    sourceY?: number;
    targetX?: number;
    targetY?: number;
    class?: ClassValue;
  }

  let {
    fromX,
    fromY,
    toX,
    toY,
    sourceX,
    sourceY,
    targetX,
    targetY,
    class: className,
  }: ConnectionLineProps = $props();

  // Svelte Flow supplies the connection through context when this component is
  // passed as `connectionLineComponent`; direct coordinates remain useful for
  // isolated rendering and deterministic tests.
  let flowConnection: ReturnType<typeof useConnection> | undefined;
  try {
    flowConnection = useConnection();
  } catch {
    flowConnection = undefined;
  }

  const coordinates = $derived.by(() => {
    const state = flowConnection?.current;
    if (state?.inProgress) {
      return {
        fromX: state.from.x,
        fromY: state.from.y,
        toX: state.to.x,
        toY: state.to.y,
        active: true,
      };
    }

    const resolvedFromX = fromX ?? sourceX;
    const resolvedFromY = fromY ?? sourceY;
    const resolvedToX = toX ?? targetX;
    const resolvedToY = toY ?? targetY;
    return {
      fromX: resolvedFromX ?? 0,
      fromY: resolvedFromY ?? 0,
      toX: resolvedToX ?? 0,
      toY: resolvedToY ?? 0,
      active: resolvedFromX !== undefined || resolvedFromY !== undefined || resolvedToX !== undefined || resolvedToY !== undefined,
    };
  });

  const path = $derived.by(() => {
    const dx = coordinates.toX - coordinates.fromX;
    const controlX = coordinates.fromX + dx * 0.5;
    return `M${coordinates.fromX},${coordinates.fromY} C ${controlX},${coordinates.fromY} ${controlX},${coordinates.toY} ${coordinates.toX},${coordinates.toY}`;
  });
</script>

{#if coordinates.active}
  <g class={cn('svadmin-ai-connection', className)} data-slot="connection">
    <path
      class="animated"
      d={path}
      fill="none"
      stroke="var(--ring, currentColor)"
      stroke-width="1"
    />
    <circle
      cx={coordinates.toX}
      cy={coordinates.toY}
      fill="var(--background, transparent)"
      r="3"
      stroke="var(--ring, currentColor)"
      stroke-width="1"
    />
  </g>
{/if}

<style>
  .svadmin-ai-connection path.animated {
    stroke-dasharray: 5 5;
    animation: svadmin-ai-connection-dash 0.8s linear infinite;
  }

  @keyframes svadmin-ai-connection-dash {
    to { stroke-dashoffset: -10; }
  }

  @media (prefers-reduced-motion: reduce) {
    .svadmin-ai-connection path.animated { animation: none; }
  }
</style>
