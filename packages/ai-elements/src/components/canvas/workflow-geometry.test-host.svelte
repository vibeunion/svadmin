<script lang="ts">
  import { Position, SvelteFlowProvider } from '@xyflow/svelte';
  import Connection from '../connection/Connection.svelte';
  import Animated from '../edge/Animated.svelte';
  import Temporary from '../edge/Temporary.svelte';

  let { kind }: { kind: 'connection' | 'temporary' | 'animated' } = $props();

  const edgeProps = {
    id: 'edge-1',
    source: 'source',
    target: 'target',
    sourceX: 0,
    sourceY: 0,
    targetX: 120,
    targetY: 40,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    type: 'custom',
    data: {},
  };
</script>

<SvelteFlowProvider>
  <svg>
    {#if kind === 'connection'}
      <Connection fromX={10} fromY={20} toX={110} toY={80} />
    {:else if kind === 'temporary'}
      <Temporary {...edgeProps} />
    {:else}
      <Animated {...edgeProps} />
    {/if}
  </svg>
</SvelteFlowProvider>
